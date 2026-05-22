import { api } from './api-client';
import type { CreateOperacionDto, DeliveryInfo, OperacionDto, OperacionStatus, UpdateOperacionDto } from './api-types';

export interface DashboardData {
  period: { from: string; to: string };
  kpis: { totalVentas: number; totalUnidades: number; totalIngresos: string; avgTicket: string };
  porTipo: Array<{ tipo: string; ventas: number; unidades: number; ingresos: string }>;
  porCategoria: Array<{ categoria: string; ventas: number; unidades: number; ingresos: string }>;
  evolucionMensual: Array<{ mes: string; ventas: number; ingresos: string }>;
  topOperaciones: Array<{ id: string; titulo: string; tipo: string; ventas: number; unidades: number; ingresos: string }>;
}

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

export function getDashboard(from?: string, to?: string): Promise<DashboardData> {
  const q = new URLSearchParams();
  if (from) q.set('from', from);
  if (to) q.set('to', to);
  const qs = q.toString();
  return api.get<DashboardData>(`/operaciones/dashboard${qs ? '?' + qs : ''}`);
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
