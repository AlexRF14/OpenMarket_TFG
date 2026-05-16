import { UserRole } from '@marketplace/shared-types';

export interface JwtPayload {
  /** userId (UUID) */
  sub: string;
  email: string;
  rol: UserRole;
}

/** Payload del token temporal emitido cuando MFA está activo. */
export interface MfaTempPayload {
  sub: string;
  type: 'mfa_pending';
}
