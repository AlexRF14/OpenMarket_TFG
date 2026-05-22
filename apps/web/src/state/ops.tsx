import { useCallback, useEffect, useState } from 'react';
import * as opsApi from '../lib/operaciones-api';
import type { CreateOperacionDto, OperacionDto, OperacionStatus, UpdateOperacionDto } from '../lib/api-types';
import { useAuth } from './auth';

export type StatusDisplay = { label: string; dot: string; bg: string; text: string };

/**
 * Hook para listar operaciones del usuario autenticado.
 * Reemplaza el viejo OpsProvider basado en localStorage.
 */
export function useOperaciones(side?: opsApi.OperacionSide) {
  const { token } = useAuth();
  const [ops, setOps] = useState<OperacionDto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!token) {
      setOps([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const list = await opsApi.listMine(side);
      setOps(list);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando operaciones');
    } finally {
      setLoading(false);
    }
  }, [token, side]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const createOp = useCallback(async (payload: CreateOperacionDto) => {
    const created = await opsApi.create(payload);
    setOps((prev) => [created, ...prev]);
    return created;
  }, []);

  const changeStatus = useCallback(async (id: string, status: OperacionStatus) => {
    const updated = await opsApi.updateStatus(id, status);
    setOps((prev) => prev.map((o) => (o.id === id ? updated : o)));
    return updated;
  }, []);

  return { ops, loading, error, reload, createOp, changeStatus };
}

/**
 * Hook para una única operación por id.
 */
export function useOperacion(id: string | undefined) {
  const { token } = useAuth();
  const [op, setOp] = useState<OperacionDto | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!token || !id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const found = await opsApi.getById(id);
      setOp(found);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando operación');
      setOp(null);
    } finally {
      setLoading(false);
    }
  }, [token, id]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const changeStatus = useCallback(async (status: OperacionStatus, force?: boolean) => {
    if (!id) return;
    const updated = await opsApi.updateStatus(id, status, force);
    setOp(updated);
    return updated;
  }, [id]);

  const updateOp = useCallback(async (payload: UpdateOperacionDto) => {
    if (!id) return;
    const updated = await opsApi.updateOp(id, payload);
    setOp(updated);
    return updated;
  }, [id]);

  const updateSettings = useCallback(async (payload: { activa?: boolean; mostrarSinStock?: boolean }) => {
    if (!id) return;
    const updated = await opsApi.updateSettings(id, payload);
    setOp(updated);
    return updated;
  }, [id]);

  return { op, loading, error, reload, changeStatus, updateOp, updateSettings };
}

export const STATUS_META: Record<OperacionStatus, StatusDisplay> = {
  pending:    { label: 'Pendiente',  dot: '#CB7350', bg: '#FBF1EC', text: '#97472A' },
  confirmed:  { label: 'Confirmada', dot: '#5C7159', bg: '#E4EAE1', text: '#3E4E3C' },
  shipped:    { label: 'Enviada',    dot: '#B85A36', bg: '#F5DED2', text: '#723524' },
  completed:  { label: 'Completada', dot: '#4A7A4A', bg: '#E4EAE1', text: '#2F4D2F' },
  disputed:   { label: 'En disputa', dot: '#B84848', bg: '#F5DCDC', text: '#7A2E2E' },
  cancelled:  { label: 'Cancelada',  dot: '#8A8A8A', bg: '#EFEDE8', text: '#555' },
  refunded:   { label: 'Reembolsada', dot: '#6A5B4A', bg: '#F3EEE4', text: '#4A3F32' },
};

/** Role-aware status label + colours for display components. */
export function getStatusDisplay(op: OperacionDto, userId?: string): StatusDisplay {
  const base = STATUS_META[op.status];
  const isBuyer = !!userId && op.idComprador === userId;
  const isSeller = !!userId && op.idVendedor === userId;

  if (isBuyer) {
    // These states don't need remapping for buyer
    if (op.status === 'refunded' || op.status === 'disputed' || op.status === 'pending') return base;

    // If seller cancelled but buyer already purchased, show delivery-based state
    if (op.status === 'cancelled' || op.status === 'completed' || op.status === 'confirmed' || op.status === 'shipped') {
      if (op.status === 'completed') {
        return { label: 'Adquirido', dot: '#4A7A4A', bg: '#E4EAE1', text: '#2F4D2F' };
      }
      const deliveryDate = op.deliveryInfo?.deliveryDate;
      const pastDelivery = !deliveryDate || new Date(deliveryDate) <= new Date();
      if (pastDelivery) return { label: 'Adquirido', dot: '#4A7A4A', bg: '#E4EAE1', text: '#2F4D2F' };
      return { label: 'Enviando', dot: '#3B6FA0', bg: '#E3EFF8', text: '#1E4A72' };
    }
    return base;
  }

  if (isSeller) {
    if (op.status === 'confirmed') return { ...base, label: 'Público' };
    if (op.status === 'shipped') return { ...base, label: 'Sin stock' };
    return base;
  }

  // Public / neutral view
  if (op.status === 'confirmed') return { ...base, label: 'Disponible' };
  if (op.status === 'shipped') return { ...base, label: 'Sin stock' };
  return base;
}
