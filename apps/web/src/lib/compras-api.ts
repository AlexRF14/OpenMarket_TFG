import { api } from './api-client';
import type { CompraDto } from './api-types';

export function getMisCompras(operacionId?: string): Promise<CompraDto[]> {
  const q = operacionId ? `?operacionId=${encodeURIComponent(operacionId)}` : '';
  return api.get<CompraDto[]>(`/compras/mias${q}`);
}

export function getComprasByOperacion(operacionId: string): Promise<CompraDto[]> {
  return api.get<CompraDto[]>(`/compras/operacion/${operacionId}`);
}

export function marcarRecibida(id: string): Promise<CompraDto> {
  return api.post<CompraDto>(`/compras/${id}/recibir`, {});
}

export function refundCompra(id: string, reason?: string): Promise<{ refundId?: string }> {
  return api.post<{ refundId?: string }>(`/payments/compra/${id}/refund`, reason ? { reason } : {});
}

export function acceptRefund(id: string): Promise<{ refundId: string }> {
  return api.post<{ refundId: string }>(`/payments/compra/${id}/refund/accept`, {});
}

export function rejectRefund(id: string): Promise<void> {
  return api.post<void>(`/payments/compra/${id}/refund/reject`, {});
}
