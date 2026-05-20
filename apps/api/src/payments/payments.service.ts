import { BadRequestException, ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { OperacionStatus, VerifiedStatus } from '@marketplace/shared-types';
import { StripeService } from './stripe.service';
import { EmpresasService } from '../empresas/empresas.service';
import { OperacionesService } from '../operaciones/operaciones.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { NotificationsService } from '../notifications/notifications.service';

/**
 * Orquesta Stripe Connect:
 *  - Onboarding de vendedores (Express + Account Links)
 *  - Cobro split via Checkout Session (`transfer_data.destination` + `application_fee_amount`)
 *  - Procesado de webhooks → actualizar Operación / Empresa en Postgres
 *
 * Modo test: la API es idéntica a producción; sólo cambia que `sk_test_*` simula
 * tarjetas y payouts. Stripe CLI reenvía los webhooks a localhost:3001/webhook.
 */
@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly stripe: StripeService,
    private readonly empresas: EmpresasService,
    private readonly operaciones: OperacionesService,
    private readonly notifications: NotificationsService,
  ) {}

  // ---------- Onboarding ----------

  async createOnboardingLink(
    empresaId: string,
    email: string,
    requesterUserId: string,
  ): Promise<{ url: string; accountId: string }> {
    const empresa = await this.empresas.findById(empresaId);
    if (empresa.idUsuario !== requesterUserId) {
      throw new ForbiddenException('No eres el propietario de esta empresa');
    }

    let accountId = empresa.stripeAccountId;
    if (!accountId) {
      const account = await this.stripe.createConnectAccount({ email });
      accountId = account.id;
      empresa.stripeAccountId = accountId;
      empresa.verifiedStatus = VerifiedStatus.PENDING;
      await this.empresas.save(empresa);
      this.logger.log(`Empresa ${empresaId}: cuenta Stripe creada ${accountId}`);
    }

    const link = await this.stripe.createAccountLink({
      accountId,
      refreshUrl: this.config.getOrThrow<string>('OPENMARKET_REFRESH_URL'),
      returnUrl: this.config.getOrThrow<string>('OPENMARKET_RETURN_URL'),
    });

    // Force Spanish locale so the user doesn't need to switch language (changing
    // language inside the hosted onboarding page triggers a page reload that can
    // expire the Account Link and close the flow).
    const linkUrl = new URL(link.url);
    linkUrl.searchParams.set('locale', 'es-ES');
    const localizedUrl = linkUrl.toString();

    empresa.stripeOnboardingUrl = localizedUrl;
    await this.empresas.save(empresa);

    return { url: localizedUrl, accountId };
  }

  // ---------- Checkout (split) ----------

  async createCheckoutSession(dto: CreateCheckoutDto): Promise<{ checkoutUrl: string; sessionId: string }> {
    const op = await this.operaciones.findById(dto.operacionId);
    if (op.status !== OperacionStatus.PENDING && op.status !== OperacionStatus.CONFIRMED) {
      throw new BadRequestException(`Operación en estado ${op.status} no admite checkout`);
    }
    if (!op.sellerCompanyId) {
      throw new BadRequestException('La operación no tiene empresa vendedora');
    }

    const empresa = await this.empresas.findById(op.sellerCompanyId);
    if (!empresa.stripeAccountId) {
      throw new BadRequestException('Vendedor sin onboarding Stripe completado');
    }

    const totalCents = Math.round(parseFloat(op.totalAmount) * 100);
    const feePercent = this.config.get<number>('STRIPE_PLATFORM_COMMISSION_PERCENT') ?? 5;
    const applicationFeeCents = Math.round(totalCents * (feePercent / 100));

    const frontendUrl = this.config.getOrThrow<string>('FRONTEND_URL');
    const session = await this.stripe.createCheckoutSession({
      amountCents: totalCents,
      applicationFeeCents,
      destinationAccount: empresa.stripeAccountId,
      currency: op.currency.toLowerCase(),
      description: op.notes ?? `Operación ${op.id.slice(0, 8)}`,
      successUrl: `${frontendUrl}/app/operaciones/${op.id}?checkout=success`,
      cancelUrl: `${frontendUrl}/app/operaciones/${op.id}?checkout=cancelled`,
      metadata: { operacionId: op.id },
      customerEmail: dto.customerEmail,
    });

    op.stripeCheckoutSessionId = session.id;
    op.stripePaymentStatus = session.payment_status;
    await this.operaciones.save(op);

    if (!session.url) throw new Error('Stripe no devolvió checkout URL');
    return { checkoutUrl: session.url, sessionId: session.id };
  }

  /**
   * Inicia la compra de una operación desde el POV del comprador.
   * Registra al comprador, crea la Checkout Session y devuelve la URL.
   * Si el vendedor tiene cuenta Stripe Express → split payment.
   * Si no → pago directo a la plataforma (para pruebas sin Connect).
   */
  async buyOperacion(opId: string, buyerId: string, quantity = 1): Promise<{ checkoutUrl: string; sessionId: string }> {
    const op = await this.operaciones.findById(opId);

    if (op.idVendedor === buyerId) {
      throw new BadRequestException('No puedes comprar tu propia operación');
    }
    if (op.status !== OperacionStatus.CONFIRMED) {
      throw new BadRequestException(`La operación no está disponible para compra (estado: ${op.status})`);
    }
    const availableStock = op.stock ?? Infinity;
    if (availableStock <= 0) {
      throw new BadRequestException('Sin stock disponible');
    }
    if (quantity > availableStock) {
      throw new BadRequestException(`Solo quedan ${availableStock} unidades disponibles`);
    }

    const frontendUrl = this.config.getOrThrow<string>('FRONTEND_URL');
    const pricePerUnitCents = Math.round(parseFloat(op.totalAmount) * 100);
    const totalCents = pricePerUnitCents * quantity;
    const feePercent = this.config.get<number>('STRIPE_PLATFORM_COMMISSION_PERCENT') ?? 5;
    const applicationFeeCents = Math.round(totalCents * (feePercent / 100));
    const description = op.titulo ?? op.notes ?? `Operación ${op.id.slice(0, 8)}`;
    const metadata: Record<string, string> = { operacionId: op.id, buyerId, quantity: String(quantity) };
    const successUrl = `${frontendUrl}/app/operaciones/${op.id}?checkout=success`;
    const cancelUrl = `${frontendUrl}/app/operaciones/${op.id}?checkout=cancelled`;

    let session: Stripe.Checkout.Session;

    const sellerStripeId = op.sellerCompanyId
      ? await this.empresas.findById(op.sellerCompanyId).then((e) => e.stripeAccountId).catch(() => null)
      : null;

    if (sellerStripeId) {
      session = await this.stripe.createCheckoutSession({
        amountCents: pricePerUnitCents,
        applicationFeeCents,
        destinationAccount: sellerStripeId,
        currency: op.currency.toLowerCase(),
        description,
        successUrl,
        cancelUrl,
        metadata,
        quantity,
      });
    } else {
      session = await this.stripe.createDirectCheckoutSession({
        amountCents: pricePerUnitCents,
        currency: op.currency.toLowerCase(),
        description,
        successUrl,
        cancelUrl,
        metadata,
        quantity,
      });
    }

    if (!session.url) throw new Error('Stripe no devolvió checkout URL');

    op.idComprador = buyerId;
    op.stripeCheckoutSessionId = session.id;
    op.stripePaymentStatus = session.payment_status;
    await this.operaciones.save(op);

    return { checkoutUrl: session.url, sessionId: session.id };
  }

  async getCheckoutStatus(sessionId: string) {
    const session = await this.stripe.retrieveCheckoutSession(sessionId);
    return {
      id: session.id,
      paymentStatus: session.payment_status,
      status: session.status,
      amountTotal: session.amount_total,
      currency: session.currency,
    };
  }

  // ---------- Webhook ----------

  async handleEvent(event: Stripe.Event): Promise<void> {
    this.logger.log(`Webhook ${event.type} (${event.id})`);

    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded':
      case 'checkout.session.async_payment_failed':
      case 'checkout.session.expired':
        await this.applyCheckoutEvent(event.data.object as Stripe.Checkout.Session);
        break;

      case 'account.updated':
        await this.applyAccountUpdate(event.data.object as Stripe.Account);
        break;

      default:
        break;
    }
  }

  private async applyCheckoutEvent(session: Stripe.Checkout.Session): Promise<void> {
    const operacionId = session.metadata?.operacionId ?? null;
    let op = operacionId
      ? await this.operaciones.findById(operacionId).catch(() => null)
      : null;
    if (!op) op = await this.operaciones.findByStripeSessionId(session.id);
    if (!op) {
      this.logger.warn(`Sesión ${session.id} sin Operación asociada`);
      return;
    }

    op.stripeCheckoutSessionId = session.id;
    op.stripePaymentStatus = session.payment_status ?? session.status ?? null;

    if (session.payment_status === 'paid') {
      const qty = parseInt(session.metadata?.quantity ?? '1', 10);
      if (!op.idComprador && session.metadata?.buyerId) op.idComprador = session.metadata.buyerId;
      if (op.stock !== null && op.stock > 0) {
        op.stock = Math.max(0, op.stock - qty);
        // only move to shipped when all stock is sold out
        if (op.stock === 0 && op.status === OperacionStatus.CONFIRMED) {
          op.status = OperacionStatus.SHIPPED;
        }
      }
    }
    // on expired/unpaid: keep confirmed so listing stays available

    await this.operaciones.save(op);
    if (session.payment_status === 'paid') {
      void this.notifications.notifyPurchaseCompleted(op);
    }
  }

  private async applyAccountUpdate(account: Stripe.Account): Promise<void> {
    const empresa = await this.empresas.findByStripeAccountId(account.id);
    if (!empresa) {
      this.logger.warn(`account.updated para ${account.id} sin empresa asociada`);
      return;
    }

    const ready = account.charges_enabled && account.payouts_enabled && account.details_submitted;
    if (ready) {
      empresa.verifiedStatus = VerifiedStatus.VERIFIED;
      empresa.verifiedAt = new Date();
      empresa.stripeRejectionReason = null;
    } else if (account.requirements?.disabled_reason) {
      empresa.verifiedStatus = VerifiedStatus.REJECTED;
      empresa.stripeRejectionReason = account.requirements.disabled_reason;
    } else {
      empresa.verifiedStatus = VerifiedStatus.PENDING;
    }

    await this.empresas.save(empresa);
  }
}
