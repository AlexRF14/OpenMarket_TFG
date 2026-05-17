import { api } from './api-client';
import type { ValoracionDto } from './api-types';

export function getValoraciones(opId: string): Promise<ValoracionDto[]> {
  return api.get<ValoracionDto[]>(`/operaciones/${opId}/valoraciones`);
}

export function createValoracion(
  opId: string,
  payload: { puntuacion: number; comentario?: string },
): Promise<ValoracionDto> {
  return api.post<ValoracionDto>(`/operaciones/${opId}/valoraciones`, payload);
}
