import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { OperacionStatus } from '@marketplace/shared-types';
import { PaymentsService } from './payments.service';
import { StripeService } from './stripe.service';
import { EmpresasService } from '../empresas/empresas.service';
import { OperacionesService } from '../operaciones/operaciones.service';
import { ComprasService } from '../compras/compras.service';
import { NotificationsService } from '../notifications/notifications.service';
import { UsuariosService } from '../usuarios/usuarios.service';
import { Operacion } from '../operaciones/entities/operacion.entity';
import { Compra } from '../compras/entities/compra.entity';

function makeOperacion(overrides: Partial<Operacion> = {}): Operacion {
  return {
    id: 'op-1',
    idComprador: null,
    idVendedor: 'seller-1',
    sellerCompanyId: null,
    buyerCompanyId: null,
    titulo: 'Producto',
    categoria: null,
    cantidad: 1,
    stock: 1,
    operationType: 'publica',
    status: OperacionStatus.CONFIRMED,
    totalAmount: '10.00',
    amountNet: '10.00',
    taxAmount: '0.00',
    platformFee: '0.50',
    currency: 'EUR',
    stripeCheckoutSessionId: null,
    stripePaymentStatus: null,
    idDireccionEnvio: null,
    chatRoomId: null,
    notes: null,
    images: null,
    activa: true,
    mostrarSinStock: false,
    deliveryInfo: null,
    purchasedAt: null,
    stripePaymentIntentId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    comprador: null,
    vendedor: null as unknown as Operacion['vendedor'],
    sellerCompany: null,
    buyerCompany: null,
    ...overrides,
  } as Operacion;
}

function makeCompra(overrides: Partial<Compra> = {}): Compra {
  return {
    id: 'compra-1',
    operacionId: 'op-1',
    compradorId: 'buyer-1',
    quantity: 1,
    deliveryInfo: null,
    status: 'pendiente_pago',
    stripeCheckoutSessionId: 'cs_1',
    stripePaymentIntentId: null,
    purchasedAt: null,
    refundReason: null,
    receivedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    operacion: null as unknown as Compra['operacion'],
    ...overrides,
  } as Compra;
}

function makeSession(overrides: Partial<Stripe.Checkout.Session> = {}): Stripe.Checkout.Session {
  return {
    id: 'cs_1',
    object: 'checkout.session',
    payment_status: 'paid',
    status: 'complete',
    payment_intent: 'pi_1',
    created: Math.floor(Date.now() / 1000),
    metadata: { operacionId: 'op-1', compraId: 'compra-1', buyerId: 'buyer-1', quantity: '1' },
    ...overrides,
  } as unknown as Stripe.Checkout.Session;
}

describe('PaymentsService — protección anti-overselling', () => {
  let service: PaymentsService;
  let operaciones: jest.Mocked<Pick<OperacionesService, 'findById' | 'save' | 'decrementStock' | 'findByStripeSessionId'>>;
  let compras: jest.Mocked<Pick<ComprasService, 'findById' | 'findBySessionId' | 'save'>>;
  let stripe: jest.Mocked<Pick<StripeService, 'createRefund'>>;
  let notifications: jest.Mocked<Pick<NotificationsService, 'notifyPurchaseCompleted'>>;

  beforeEach(() => {
    operaciones = {
      findById: jest.fn(),
      save: jest.fn(),
      decrementStock: jest.fn(),
      findByStripeSessionId: jest.fn(),
    };
    compras = {
      findById: jest.fn(),
      findBySessionId: jest.fn(),
      save: jest.fn(),
    };
    stripe = { createRefund: jest.fn() };
    notifications = { notifyPurchaseCompleted: jest.fn() };

    operaciones.save.mockImplementation(async (op) => op as Operacion);
    compras.save.mockImplementation(async (c) => c as Compra);
    stripe.createRefund.mockResolvedValue({ id: 're_1' } as Stripe.Refund);
    notifications.notifyPurchaseCompleted.mockResolvedValue(undefined);

    service = new PaymentsService(
      { get: jest.fn(), getOrThrow: jest.fn() } as unknown as ConfigService,
      stripe as unknown as StripeService,
      {} as EmpresasService,
      operaciones as unknown as OperacionesService,
      compras as unknown as ComprasService,
      notifications as unknown as NotificationsService,
      {} as UsuariosService,
    );
  });

  it('confirma la compra y decrementa stock atómicamente cuando hay unidades disponibles', async () => {
    const op = makeOperacion({ stock: 1 });
    const compra = makeCompra();
    operaciones.findById.mockResolvedValue(op);
    compras.findById.mockResolvedValue(compra);
    operaciones.decrementStock.mockResolvedValue(0); // 1 - 1 = 0 restantes

    await service.handleEvent({ type: 'checkout.session.completed', data: { object: makeSession() } } as Stripe.Event);

    expect(operaciones.decrementStock).toHaveBeenCalledWith('op-1', 1);
    expect(compra.status).toBe('activo');
    expect(stripe.createRefund).not.toHaveBeenCalled();
    expect(notifications.notifyPurchaseCompleted).toHaveBeenCalled();
  });

  it('detecta condición de carrera (0 filas afectadas) y reembolsa automáticamente sin activar la compra', async () => {
    const op = makeOperacion({ stock: 1 });
    const compra = makeCompra({ id: 'compra-2', stripeCheckoutSessionId: 'cs_2' });
    operaciones.findById.mockResolvedValue(op);
    compras.findById.mockResolvedValue(compra);
    // Simula que otro comprador ya agotó el stock entre el checkout y este webhook:
    // UPDATE ... WHERE stock >= qty afecta 0 filas.
    operaciones.decrementStock.mockResolvedValue(null);

    await service.handleEvent({
      type: 'checkout.session.completed',
      data: { object: makeSession({ id: 'cs_2', metadata: { operacionId: 'op-1', compraId: 'compra-2', buyerId: 'buyer-2', quantity: '1' }, payment_intent: 'pi_2' }) },
    } as Stripe.Event);

    expect(operaciones.decrementStock).toHaveBeenCalledWith('op-1', 1);
    expect(compra.status).toBe('reembolsada');
    expect(stripe.createRefund).toHaveBeenCalledWith('pi_2');
    expect(notifications.notifyPurchaseCompleted).not.toHaveBeenCalled();
  });

  it('dos webhooks concurrentes para la última unidad: solo uno gana, el otro se reembolsa (no overselling)', async () => {
    const op1 = makeOperacion({ stock: 1 });
    const op2 = makeOperacion({ stock: 1 });
    const compraA = makeCompra({ id: 'compra-a', stripeCheckoutSessionId: 'cs_a' });
    const compraB = makeCompra({ id: 'compra-b', stripeCheckoutSessionId: 'cs_b' });

    operaciones.findById.mockResolvedValueOnce(op1).mockResolvedValueOnce(op2);
    compras.findById.mockResolvedValueOnce(compraA).mockResolvedValueOnce(compraB);
    // Solo la primera llamada atómica tiene éxito (simula el UPDATE ... WHERE stock >= qty real)
    operaciones.decrementStock.mockResolvedValueOnce(0).mockResolvedValueOnce(null);

    await Promise.all([
      service.handleEvent({
        type: 'checkout.session.completed',
        data: { object: makeSession({ id: 'cs_a', metadata: { operacionId: 'op-1', compraId: 'compra-a', buyerId: 'buyer-a', quantity: '1' }, payment_intent: 'pi_a' }) },
      } as Stripe.Event),
      service.handleEvent({
        type: 'checkout.session.completed',
        data: { object: makeSession({ id: 'cs_b', metadata: { operacionId: 'op-1', compraId: 'compra-b', buyerId: 'buyer-b', quantity: '1' }, payment_intent: 'pi_b' }) },
      } as Stripe.Event),
    ]);

    const activos = [compraA.status, compraB.status].filter((s) => s === 'activo');
    const reembolsadas = [compraA.status, compraB.status].filter((s) => s === 'reembolsada');
    expect(activos).toHaveLength(1);
    expect(reembolsadas).toHaveLength(1);
    expect(stripe.createRefund).toHaveBeenCalledTimes(1);
  });
});
