import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

/**
 * Wrapper de bajo nivel sobre el SDK de Stripe.
 * Expone únicamente las llamadas concretas que el resto del backend necesita.
 *
 * En modo test (sk_test_*) la API es idéntica a producción: las cuentas Express,
 * checkout sessions y webhooks funcionan igual, sólo se simulan tarjetas/payouts
 * con números de prueba (4242 4242 4242 4242, etc.).
 */
@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private readonly client: Stripe;
  private readonly webhookSecret: string;

  constructor(private readonly config: ConfigService) {
    this.client = new Stripe(this.config.getOrThrow<string>('STRIPE_SECRET_KEY'), {
      apiVersion: '2025-02-24.acacia',
      typescript: true,
    });
    this.webhookSecret = this.config.getOrThrow<string>('STRIPE_WEBHOOK_SECRET');
  }

  /**
   * Crea una cuenta Express para un vendedor.
   * En test mode la cuenta queda creada al instante con `acct_xxx`.
   */
  createConnectAccount(params: { email: string; country?: string }): Promise<Stripe.Account> {
    return this.client.accounts.create({
      type: 'express',
      country: params.country ?? 'ES',
      email: params.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });
  }

  /**
   * Genera un Account Link de onboarding (URL hosted por Stripe).
   * Caduca a los pocos minutos: regenerar bajo demanda.
   */
  createAccountLink(params: {
    accountId: string;
    refreshUrl: string;
    returnUrl: string;
  }): Promise<Stripe.AccountLink> {
    return this.client.accountLinks.create({
      account: params.accountId,
      refresh_url: params.refreshUrl,
      return_url: params.returnUrl,
      type: 'account_onboarding',
    });
  }

  /** Recupera estado actual de una cuenta Express (charges_enabled, payouts_enabled, requirements...). */
  retrieveAccount(accountId: string): Promise<Stripe.Account> {
    return this.client.accounts.retrieve(accountId);
  }

  /**
   * Crea una Checkout Session con destination charge: el cargo se crea en la
   * plataforma y se transfiere al vendedor menos `application_fee_amount`.
   *
   * @param amountCents total a cobrar en céntimos
   * @param applicationFeeCents comisión retenida por la plataforma
   * @param destinationAccount acct_xxx del vendedor
   */
  createCheckoutSession(params: {
    amountCents: number;
    applicationFeeCents: number;
    destinationAccount: string;
    currency?: string;
    description: string;
    successUrl: string;
    cancelUrl: string;
    metadata?: Record<string, string>;
    customerEmail?: string;
    quantity?: number;
    extraLineItems?: { name: string; amountCents: number }[];
  }): Promise<Stripe.Checkout.Session> {
    return this.client.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          quantity: params.quantity ?? 1,
          price_data: {
            currency: params.currency ?? 'eur',
            unit_amount: params.amountCents,
            product_data: { name: params.description },
          },
        },
        ...this.buildExtraLineItems(params.extraLineItems, params.currency),
      ],
      payment_intent_data: {
        application_fee_amount: params.applicationFeeCents,
        transfer_data: { destination: params.destinationAccount },
      },
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      metadata: params.metadata,
      customer_email: params.customerEmail,
    });
  }

  /** Checkout directo a la plataforma (sin Stripe Connect), para vendedores sin cuenta Express. */
  createDirectCheckoutSession(params: {
    amountCents: number;
    currency?: string;
    description: string;
    successUrl: string;
    cancelUrl: string;
    metadata?: Record<string, string>;
    customerEmail?: string;
    quantity?: number;
    extraLineItems?: { name: string; amountCents: number }[];
  }): Promise<Stripe.Checkout.Session> {
    return this.client.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          quantity: params.quantity ?? 1,
          price_data: {
            currency: params.currency ?? 'eur',
            unit_amount: params.amountCents,
            product_data: { name: params.description },
          },
        },
        ...this.buildExtraLineItems(params.extraLineItems, params.currency),
      ],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      metadata: params.metadata,
      customer_email: params.customerEmail,
    });
  }

  private buildExtraLineItems(
    items: { name: string; amountCents: number }[] | undefined,
    currency?: string,
  ): Stripe.Checkout.SessionCreateParams.LineItem[] {
    if (!items?.length) return [];
    return items.map((item) => ({
      quantity: 1,
      price_data: {
        currency: currency ?? 'eur',
        unit_amount: item.amountCents,
        product_data: { name: item.name },
      },
    }));
  }

  retrieveCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session> {
    return this.client.checkout.sessions.retrieve(sessionId);
  }

  createRefund(paymentIntentId: string): Promise<Stripe.Refund> {
    return this.client.refunds.create({ payment_intent: paymentIntentId });
  }

  /**
   * Verifica firma del webhook contra `STRIPE_WEBHOOK_SECRET`.
   * Lanza si la firma no coincide — Nest convierte a 400.
   */
  constructEvent(rawBody: Buffer | string, signature: string): Stripe.Event {
    return this.client.webhooks.constructEvent(rawBody, signature, this.webhookSecret);
  }
}
