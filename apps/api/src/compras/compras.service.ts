import { Injectable } from '@nestjs/common';
import { Compra } from './entities/compra.entity';
import { ComprasRepository } from './compras.repository';

export interface CompraResponseDto {
  id: string;
  operacionId: string;
  compradorId: string;
  quantity: number;
  totalAmount: string;
  totalPagado: string;
  currency: string;
  titulo: string | null;
  categoria: string | null;
  images: string[] | null;
  idVendedor: string;
  operacionStatus: string;
  deliveryInfo: Record<string, unknown> | null;
  purchasedAt: string | null;
  stripePaymentIntentId: string | null;
  receivedAt: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class ComprasService {
  constructor(private readonly repo: ComprasRepository) {}

  findById(id: string): Promise<Compra | null> {
    return this.repo.findById(id);
  }

  findBySessionId(sessionId: string): Promise<Compra | null> {
    return this.repo.findBySessionId(sessionId);
  }

  findByComprador(compradorId: string): Promise<Compra[]> {
    return this.repo.findByComprador(compradorId);
  }

  findByOperacion(operacionId: string): Promise<Compra[]> {
    return this.repo.findByOperacion(operacionId);
  }

  save(data: Partial<Compra>): Promise<Compra> {
    return this.repo.save(data);
  }

  toDto(compra: Compra): CompraResponseDto {
    const op = compra.operacion;
    const totalPagado = op
      ? (parseFloat(op.totalAmount) * compra.quantity).toFixed(2)
      : '0.00';
    return {
      id: compra.id,
      operacionId: compra.operacionId,
      compradorId: compra.compradorId,
      quantity: compra.quantity,
      totalAmount: op?.totalAmount ?? '0.00',
      totalPagado,
      currency: op?.currency ?? 'EUR',
      titulo: op?.titulo ?? null,
      categoria: op?.categoria ?? null,
      images: op?.images ?? null,
      idVendedor: op?.idVendedor ?? '',
      operacionStatus: op?.status ?? 'pending',
      deliveryInfo: compra.deliveryInfo,
      purchasedAt: compra.purchasedAt?.toISOString() ?? null,
      stripePaymentIntentId: compra.stripePaymentIntentId,
      receivedAt: compra.receivedAt?.toISOString() ?? null,
      status: compra.status,
      createdAt: compra.createdAt.toISOString(),
      updatedAt: compra.updatedAt.toISOString(),
    };
  }
}
