import { useCallback, useEffect, useState } from 'react';
import * as opsApi from '../lib/operaciones-api';
import type { CreateOperacionDto, OperacionDto, OperacionStatus } from '../lib/api-types';
import { useAuth } from './auth';

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

  const changeStatus = useCallback(async (status: OperacionStatus) => {
    if (!id) return;
    const updated = await opsApi.updateStatus(id, status);
    setOp(updated);
    return updated;
  }, [id]);

  return { op, loading, error, reload, changeStatus };
}

export const STATUS_META: Record<OperacionStatus, { label: string; dot: string; bg: string; text: string }> = {
  pending:    { label: 'Pendiente',  dot: '#CB7350', bg: '#FBF1EC', text: '#97472A' },
  confirmed:  { label: 'Confirmada', dot: '#5C7159', bg: '#E4EAE1', text: '#3E4E3C' },
  shipped:    { label: 'Enviada',    dot: '#B85A36', bg: '#F5DED2', text: '#723524' },
  completed:  { label: 'Completada', dot: '#4A7A4A', bg: '#E4EAE1', text: '#2F4D2F' },
  disputed:   { label: 'En disputa', dot: '#B84848', bg: '#F5DCDC', text: '#7A2E2E' },
  cancelled:  { label: 'Cancelada',  dot: '#8A8A8A', bg: '#EFEDE8', text: '#555' },
  refunded:   { label: 'Reembolsada', dot: '#6A5B4A', bg: '#F3EEE4', text: '#4A3F32' },
};
