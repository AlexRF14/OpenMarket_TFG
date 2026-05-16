import { Injectable } from '@nestjs/common';
import { UsuariosService } from '../usuarios/usuarios.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import {
  UserSettings,
  DEFAULT_USER_SETTINGS,
} from './interfaces/user-settings.interface';

@Injectable()
export class SettingsService {
  constructor(private readonly usuariosService: UsuariosService) {}

  /**
   * Devuelve settings del usuario, rellenando con defaults cualquier clave faltante.
   * Protege contra settings incompletos que puedan existir por migraciones antiguas.
   */
  async getSettings(userId: string): Promise<UserSettings> {
    const usuario = await this.usuariosService.findById(userId);
    return this.mergeWithDefaults(usuario.settings as Partial<UserSettings>);
  }

  /**
   * Hace deep merge del body parcial con los settings actuales y persiste.
   * Solo se sobreescriben las claves enviadas — el resto permanece intacto.
   */
  async updateSettings(userId: string, dto: UpdateSettingsDto): Promise<UserSettings> {
    const current = await this.getSettings(userId);
    const merged = deepMerge(current, dto as Partial<UserSettings>);
    await this.usuariosService.save({ id: userId, settings: merged as unknown as Record<string, unknown> });
    return merged;
  }

  /** Devuelve campos de perfil (columnas SQL, no JSONB). */
  async getProfile(userId: string) {
    const { id, nombre, apellidos, correo, rol } = await this.usuariosService.findById(userId);
    return { id, nombre, apellidos, correo, rol };
  }

  private mergeWithDefaults(partial: Partial<UserSettings>): UserSettings {
    return deepMerge(DEFAULT_USER_SETTINGS, partial);
  }
}

/**
 * Deep merge: target keys not in source are preserved.
 * Source keys overwrite target. Only plain objects are merged recursively.
 */
function deepMerge<T extends object>(target: T, source: Partial<T>): T {
  const result = { ...target };
  for (const key of Object.keys(source) as (keyof T)[]) {
    const src = source[key];
    const tgt = target[key];
    if (
      src !== null &&
      src !== undefined &&
      typeof src === 'object' &&
      !Array.isArray(src) &&
      tgt !== null &&
      tgt !== undefined &&
      typeof tgt === 'object' &&
      !Array.isArray(tgt)
    ) {
      result[key] = deepMerge(tgt as object, src as object) as T[keyof T];
    } else if (src !== undefined) {
      result[key] = src as T[keyof T];
    }
  }
  return result;
}
