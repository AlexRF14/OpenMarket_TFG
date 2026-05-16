import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { StripeService } from './stripe.service';
import { PaymentsService } from './payments.service';

/**
 * Webhook de Stripe. La ruta `/webhook` queda fuera del global prefix `api/v1`
 * para coincidir con la configuración por defecto de `stripe listen --forward-to localhost:3001/webhook`.
 *
 * Requiere body raw (Buffer) para verificar la firma. Configurado en main.ts
 * via `NestFactory.create(AppModule, { rawBody: true })`.
 */
@ApiExcludeController()
@Controller('webhook')
export class WebhookController {
  constructor(
    private readonly stripe: StripeService,
    private readonly payments: PaymentsService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async handle(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    if (!signature) throw new BadRequestException('Falta header stripe-signature');
    if (!req.rawBody) throw new BadRequestException('Body raw no disponible');

    let event;
    try {
      event = this.stripe.constructEvent(req.rawBody, signature);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'firma inválida';
      throw new BadRequestException(`Webhook signature error: ${msg}`);
    }

    await this.payments.handleEvent(event);
    return { received: true };
  }
}
