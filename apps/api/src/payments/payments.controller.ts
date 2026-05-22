import { Body, Controller, Get, Param, Post, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { CreateOnboardingDto } from './dto/create-onboarding.dto';
import { BuyOperacionDto } from './dto/buy-operacion.dto';
import { RefundRequestDto } from './dto/refund-request.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';

@ApiTags('payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post('connect/onboarding')
  @ApiOperation({ summary: 'Crear cuenta Stripe Express + URL de onboarding' })
  @ApiResponse({ status: 201, description: 'Devuelve `{ url, accountId }`' })
  @ApiResponse({ status: 403, description: 'El usuario no es propietario de la empresa' })
  @ApiResponse({ status: 404, description: 'Empresa no encontrada' })
  startOnboarding(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateOnboardingDto,
  ) {
    return this.payments.createOnboardingLink(dto.empresaId, dto.email, user.id);
  }

  @Post('checkout')
  @ApiOperation({ summary: 'Crear Checkout Session split (plataforma + vendedor)' })
  @ApiResponse({ status: 201, description: 'Devuelve `{ checkoutUrl, sessionId }`' })
  createCheckout(@Body() dto: CreateCheckoutDto) {
    return this.payments.createCheckoutSession(dto);
  }

  @Post('operacion/:id/checkout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Comprador inicia pago de una operación — devuelve Stripe Checkout URL' })
  @ApiResponse({ status: 200, description: '{ checkoutUrl, sessionId }' })
  @ApiResponse({ status: 400, description: 'Operación no disponible o sin stock' })
  buyOperacion(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: BuyOperacionDto,
  ) {
    return this.payments.buyOperacion(id, user.id, dto.quantity ?? 1, dto.deliveryInfo as unknown as Record<string, unknown>);
  }

  @Post('compra/:id/refund')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Solicitar reembolso — B2C: Stripe directo. B2B/C2C: solicitud al vendedor.' })
  @ApiResponse({ status: 200, description: '{ refundId? }' })
  @ApiResponse({ status: 400, description: 'Plazo expirado, sin datos de pago, o solicitud ya existente' })
  @ApiResponse({ status: 403, description: 'Solo el comprador puede solicitar' })
  refundCompra(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: RefundRequestDto,
  ) {
    return this.payments.refundCompra(id, user.id, dto.reason);
  }

  @Post('compra/:id/refund/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Vendedor acepta la solicitud — ejecuta reembolso en Stripe' })
  @ApiResponse({ status: 200, description: '{ refundId }' })
  @ApiResponse({ status: 403, description: 'Solo el vendedor puede aceptar' })
  acceptRefund(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.payments.acceptRefund(id, user.id);
  }

  @Post('compra/:id/refund/reject')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Vendedor rechaza la solicitud — escala a revisión por plataforma' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 403, description: 'Solo el vendedor puede rechazar' })
  rejectRefund(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.payments.rejectRefund(id, user.id);
  }

  @Get('checkout/:sessionId')
  @ApiOperation({ summary: 'Estado actual de una Checkout Session' })
  getCheckoutStatus(@Param('sessionId') sessionId: string) {
    return this.payments.getCheckoutStatus(sessionId);
  }
}
