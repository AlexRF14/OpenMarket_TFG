import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { UsuariosService } from '../../usuarios/usuarios.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly usuariosService: UsuariosService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  /** Valida que el usuario aún exista y esté activo. */
  async validate(payload: JwtPayload) {
    const usuario = await this.usuariosService.findById(payload.sub);
    if (!usuario || !usuario.isActive) {
      throw new UnauthorizedException('Usuario inactivo o eliminado');
    }
    return { id: payload.sub, correo: payload.email, rol: payload.rol };
  }
}
