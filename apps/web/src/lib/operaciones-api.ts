import { api } from './api-client';
import type { CreateOperacionDto, DeliveryInfo, OperacionDto, OperacionStatus, UpdateOperacionDto } from './api-types';

export type OperacionSide = 'comprando' | 'vendiendo';

export function listMine(side?: OperacionSide): Promise<OperacionDto[]> {
  const q = side ? `?side=${side}` : '';
  return api.get<OperacionDto[]>(`/operaciones/mias${q}`);
}

export function getById(id: string): Promise<OperacionDto> {
  return api.get<OperacionDto>(`/operaciones/${id}`);
}

export function create(payload: CreateOperacionDto): Promise<OperacionDto> {
  return api.post<OperacionDto>('/operaciones', payload);
}

export function updateStatus(id: string, status: OperacionStatus, force?: boolean): Promise<OperacionDto> {
  return api.patch<OperacionDto>(`/operaciones/${id}/status`, { status, ...(force ? { force: true } : {}) });
}

export function listPublic(q?: string): Promise<OperacionDto[]> {
  const qs = q ? `?q=${encodeURIComponent(q)}` : '';
  return api.get<OperacionDto[]>(`/operaciones/explorador${qs}`);
}

export function updateOp(id: string, payload: UpdateOperacionDto): Promise<OperacionDto> {
  return api.patch<OperacionDto>(`/operaciones/${id}`, payload);
}

export function updateSettings(id: string, payload: { activa?: boolean; mostrarSinStock?: boolean }): Promise<OperacionDto> {
  return api.patch<OperacionDto>(`/operaciones/${id}/settings`, payload);
}

export function requestRefund(id: string): Promise<{ refundId: string }> {
  return api.post<{ refundId: string }>(`/payments/operacion/${id}/refund`, {});
}

export function initiateCheckout(
  id: string,
  quantity = 1,
  deliveryInfo?: DeliveryInfo,
): Promise<{ checkoutUrl: string; sessionId: string }> {
  return api.post<{ checkoutUrl: string; sessionId: string }>(`/payments/operacion/${id}/checkout`, {
    quantity,
    deliveryInfo,
  });
}
