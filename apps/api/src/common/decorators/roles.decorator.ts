import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@marketplace/shared-types';

export const ROLES_KEY = 'roles';

/** Decora un endpoint con los roles que pueden acceder. Usar junto con RolesGuard. */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
