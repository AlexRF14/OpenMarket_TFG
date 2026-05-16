import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface CurrentUserPayload {
  id: string;
  correo: string;
  rol: string;
}

/** Extrae el usuario autenticado del request (validado por JwtStrategy). */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentUserPayload => {
    const request = ctx.switchToHttp().getRequest<{ user: CurrentUserPayload }>();
    return request.user;
  },
);
