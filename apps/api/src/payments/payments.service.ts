import { BadRequestException, ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { OperacionStatus, VerifiedStatus } from '@marketplace/shared-types';
import { StripeService } from './stripe.service';
import { EmpresasService } from '../empresas/empresas.service';
import { OperacionesService } from '../operaciones/operaciones.service';
import { ComprasService } from '../compras/compras.service';
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
    private readonly compras: ComprasService,
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
  async buyOperacion(
    opId: string,
    buyerId: string,
    quantity = 1,
    deliveryInfo?: Record<string, unknown>,
  ): Promise<{ checkoutUrl: string; sessionId: string }> {
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
    const successUrl = `${frontendUrl}/app/operaciones/${op.id}?checkout=success`;
    const cancelUrl = `${frontendUrl}/app/operaciones/${op.id}?checkout=cancelled`;

    // Create pending compra record — confirmed by webhook on payment success
    const compra = await this.compras.save({
      operacionId: op.id,
      compradorId: buyerId,
      quantity,
      deliveryInfo: deliveryInfo ?? null,
      status: 'pendiente_pago',
    });

    const metadata: Record<string, string> = {
      operacionId: op.id,
      buyerId,
      quantity: String(quantity),
      compraId: compra.id,
    };

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

    compra.stripeCheckoutSessionId = session.id;
    await this.compras.save(compra);

    // Keep legacy op fields for backward compat
    op.stripeCheckoutSessionId = session.id;
    op.stripePaymentStatus = session.payment_status;
    await this.operaciones.save(op);

    return { checkoutUrl: session.url, sessionId: session.id };
  }

  async refundCompra(compraId: string, requesterId: string): Promise<{ refundId: string }> {
    const compra = await this.compras.findById(compraId);
    if (!compra) throw new BadRequestException('Compra no encontrada');
    if (compra.compradorId !== requesterId) {
      throw new ForbiddenException('Solo el comprador puede solicitar un reembolso');
    }
    if (compra.status === 'reembolsada') {
      throw new BadRequestException('Esta compra ya ha sido reembolsada');
    }
    if (compra.status !== 'activo') {
      throw new BadRequestException('Solo se pueden reembolsar compras completadas');
    }
    if (!compra.stripePaymentIntentId) {
      throw new BadRequestException('No hay datos de pago registrados para esta compra');
    }
    if (!compra.purchasedAt) {
      throw new BadRequestException('Fecha de compra no registrada');
    }

    const daysSince = (Date.now() - compra.purchasedAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince > 14) {
      throw new BadRequestException('El plazo de 14 días para solicitar un reembolso ha expirado');
    }

    const refund = await this.stripe.createRefund(compra.stripePaymentIntentId);
    compra.status = 'reembolsada';
    await this.compras.save(compra);

    return { refundId: refund.id };
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
    const compraId = session.metadata?.compraId ?? null;

    // Find the associated compra
    let compra = compraId
      ? await this.compras.findById(compraId).catch(() => null)
      : null;
    if (!compra) compra = await this.compras.findBySessionId(session.id);

    // Find the operation
    let op = operacionId
      ? await this.operaciones.findById(operacionId).catch(() => null)
      : null;
    if (!op && compra) op = compra.operacion ?? await this.operaciones.findById(compra.operacionId).catch(() => null);
    if (!op) op = await this.operaciones.findByStripeSessionId(session.id);
    if (!op) {
      this.logger.warn(`Sesión ${session.id} sin Operación asociada`);
      return;
    }

    op.stripeCheckoutSessionId = session.id;
    op.stripePaymentStatus = session.payment_status ?? session.status ?? null;

    if (session.payment_status === 'paid') {
      const qty = parseInt(session.metadata?.quantity ?? '1', 10);
      const buyerId = session.metadata?.buyerId ?? compra?.compradorId ?? null;
      const purchasedAt = new Date(session.created * 1000);
      const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : null;

      // Update compra record
      if (compra) {
        compra.status = 'activo';
        compra.purchasedAt = purchasedAt;
        if (paymentIntentId) compra.stripePaymentIntentId = paymentIntentId;
        await this.compras.save(compra);
      }

      // Update operation stock and legacy buyer fields
      if (buyerId && !op.idComprador) op.idComprador = buyerId;
      op.purchasedAt = purchasedAt;
      if (paymentIntentId) op.stripePaymentIntentId = paymentIntentId;
      if (op.stock !== null && op.stock > 0) {
        op.stock = Math.max(0, op.stock - qty);
        if (op.stock === 0 && op.status === OperacionStatus.CONFIRMED) {
          op.status = OperacionStatus.SHIPPED;
        }
      }

      await this.operaciones.save(op);
      void this.notifications.notifyPurchaseCompleted(op);
    } else {
      await this.operaciones.save(op);
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
