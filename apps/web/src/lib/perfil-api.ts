import { api } from './api-client';
import type { OperacionDto, UserRole } from './api-types';

export interface PerfilResponse {
  id: string;
  nombre: string;
  apellidos: string;
  rol: UserRole;
  correo: string | null;
  bio: string | null;
  empresaNombre?: string | null;
  publicProfile: boolean;
  operaciones: OperacionDto[];
}

export interface VendedorDto {
  id: string;
  nombre: string;
  apellidos: string;
  bio: string | null;
}

/** @returns Perfil de un usuario (puede estar restringido si es privado). */
export function getPerfil(id: string): Promise<PerfilResponse> {
  return api.get<PerfilResponse>(`/perfil/${id}`);
}

/** Actualiza la bio del usuario autenticado. */
export function updateBio(bio: string | null): Promise<{ bio: string | null }> {
  return api.patch<{ bio: string | null }>('/perfil', { bio });
}

/** Busca vendedores por nombre/bio con perfil público. */
export function searchVendedores(q?: string): Promise<VendedorDto[]> {
  const params = q ? `?q=${encodeURIComponent(q)}` : '';
  return api.get<VendedorDto[]>(`/perfil/vendedores${params}`);
}
