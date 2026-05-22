import {
  Injectable, ConflictException, UnauthorizedException,
  BadRequestException, Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import * as bcrypt from 'bcrypt';
import { generateSecret, generateURI, verifySync } from 'otplib';
import { UserRole, MfaType } from '@marketplace/shared-types';
import { DEFAULT_USER_SETTINGS } from '../settings/interfaces/user-settings.interface';
import { UsuariosService } from '../usuarios/usuarios.service';
import { FirebaseAdminService } from '../chat/firebase-admin.service';
import { JwtPayload, MfaTempPayload } from './interfaces/jwt-payload.interface';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { VerifyMfaDto } from './dto/verify-mfa.dto';
import { ActivateMfaDto } from './dto/activate-mfa.dto';
import { DeactivateMfaDto } from './dto/deactivate-mfa.dto';

const BCRYPT_ROUNDS = 12;
const REFRESH_COOKIE_NAME = 'refresh_token';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usuariosService: UsuariosService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly firebase: FirebaseAdminService,
  ) {}

  // ─────────────────────────────────────────────────────────────
  // FLUJO 1: REGISTRO
  // ─────────────────────────────────────────────────────────────

  /**
   * Registra un nuevo usuario. Hashea contraseña con bcrypt (12 rounds).
   * @throws ConflictException si el correo ya existe
   */
  async register(dto: RegisterDto, res: Response) {
    const existing = await this.usuariosService.findByEmail(dto.correo);
    if (existing) throw new ConflictException('El correo ya está registrado');

    const contrasenaHash = await bcrypt.hash(dto.contrasena, BCRYPT_ROUNDS);

    const usuario = await this.usuariosService.save({
      nombre: dto.nombre,
      apellidos: dto.apellidos,
      correo: dto.correo,
      contrasenaHash,
      rol: dto.rol as UserRole,
      isActive: true,
      settings: DEFAULT_USER_SETTINGS as unknown as Record<string, unknown>,
    });

    this.logger.log(`Usuario registrado: ${usuario.id}`);
    return this.issueTokens(usuario.id, usuario.correo, usuario.rol, res);
  }

  // ─────────────────────────────────────────────────────────────
  // FLUJO 2: LOGIN EMAIL + CONTRASEÑA
  // ─────────────────────────────────────────────────────────────

  /**
   * Si MFA activo → devuelve { mfaRequired: true, tempToken }.
   * Si no → devuelve access token y setea refresh cookie.
   * @throws UnauthorizedException si credenciales inválidas
   */
  async login(dto: LoginDto, res: Response) {
    const usuario = await this.usuariosService.findByEmailWithSecurity(dto.correo);
    if (!usuario || !usuario.isActive) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const passwordValid = await bcrypt.compare(dto.contrasena, usuario.contrasenaHash);
    if (!passwordValid) throw new UnauthorizedException('Credenciales inválidas');

    const seguridad = (usuario as unknown as { seguridad?: { mfaType: MfaType | null } }).seguridad;

    if (seguridad?.mfaType) {
      const tempToken = this.signTempToken(usuario.id);
      return { mfaRequired: true, tempToken };
    }

    return this.issueTokens(usuario.id, usuario.correo, usuario.rol, res);
  }

  // ─────────────────────────────────────────────────────────────
  // FLUJO 3: LOGIN CON GOOGLE (Firebase)
  // ─────────────────────────────────────────────────────────────

  /**
   * Verifica idToken de Firebase. Vincula o crea usuario automáticamente.
   * @throws UnauthorizedException si el idToken es inválido
   */
  async googleLogin(dto: GoogleLoginDto, res: Response) {
    let decoded;
    try {
      decoded = await this.firebase.verifyIdToken(dto.idToken);
    } catch {
      throw new UnauthorizedException('Firebase ID token inválido o expirado');
    }

    const { uid, email, name } = decoded;
    if (!email) throw new UnauthorizedException('El token de Google no contiene email');

    // Buscar por firebase_uid primero, luego por correo
    let usuario = await this.usuariosService.findByFirebaseUid(uid);

    if (!usuario) {
      usuario = await this.usuariosService.findByEmail(email);
      if (usuario) {
        // Vincular firebase_uid al usuario existente
        usuario = await this.usuariosService.save({ ...usuario, firebaseUid: uid });
      } else {
        // Crear nuevo usuario con Google
        const [nombre = '', ...rest] = (name ?? email).split(' ');
        usuario = await this.usuariosService.save({
          nombre,
          apellidos: rest.join(' ') || '-',
          correo: email,
          contrasenaHash: '',     // No tiene contraseña local
          rol: UserRole.CLIENTE,
          isActive: true,
          firebaseUid: uid,
          settings: DEFAULT_USER_SETTINGS as unknown as Record<string, unknown>,
        });
        this.logger.log(`Usuario creado via Google: ${usuario.id}`);
      }
    }

    if (!usuario.isActive) throw new UnauthorizedException('Cuenta desactivada');

    return this.issueTokens(usuario.id, usuario.correo, usuario.rol, res);
  }

  // ─────────────────────────────────────────────────────────────
  // FLUJO 4: VERIFICACIÓN MFA
  // ─────────────────────────────────────────────────────────────

  /**
   * Valida código TOTP usando el temp_token del login.
   * Emite JWT final si el código es correcto.
   */
  async verifyMfa(dto: VerifyMfaDto, res: Response) {
    let payload: MfaTempPayload;
    try {
      payload = this.jwtService.verify<MfaTempPayload>(dto.tempToken, {
        secret: this.config.getOrThrow('JWT_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Temp token inválido o expirado');
    }

    if (payload.type !== 'mfa_pending') {
      throw new UnauthorizedException('Token no es de tipo MFA');
    }

    const seguridad = await this.usuariosService.findSecurityByUserId(payload.sub);
    if (!seguridad?.mfaSecret) {
      throw new BadRequestException('MFA no configurado para este usuario');
    }

    const isValid = verifySync({ token: dto.code, secret: seguridad.mfaSecret }).valid;
    if (!isValid) throw new UnauthorizedException('Código MFA incorrecto');

    // Actualizar last_mfa_login
    await this.usuariosService.saveSecurity({ ...seguridad, lastMfaLogin: new Date() });

    const usuario = await this.usuariosService.findById(payload.sub);
    return this.issueTokens(usuario.id, usuario.correo, usuario.rol, res);
  }

  // ─────────────────────────────────────────────────────────────
  // FLUJO 5: ACTIVAR MFA (paso 1 — generar secreto)
  // ─────────────────────────────────────────────────────────────

  /**
   * Genera secreto TOTP y URL de QR. El cliente debe confirmar con un código
   * válido llamando a POST /auth/mfa/activate antes de que el secreto se persista.
   */
  async setupMfa(userId: string) {
    const usuario = await this.usuariosService.findById(userId);
    const secret = generateSecret();
    const otpauthUrl = generateURI({ issuer: 'OpenMarket', label: usuario.correo, secret });

    return {
      secret,
      otpauthUrl,
      message: 'Escanea el QR con Google Authenticator y confirma con POST /auth/mfa/activate',
    };
  }

  // ─────────────────────────────────────────────────────────────
  // FLUJO 5: ACTIVAR MFA (paso 2 — confirmar con código)
  // ─────────────────────────────────────────────────────────────

  /**
   * Confirma activación MFA validando el primer código TOTP con el secreto recibido.
   * Solo persiste el secreto si el código es correcto.
   */
  async activateMfa(userId: string, dto: ActivateMfaDto) {
    const { valid } = verifySync({ token: dto.code, secret: dto.secret });
    if (!valid) throw new BadRequestException('Código TOTP incorrecto — secreto no guardado');

    await this.usuariosService.saveSecurity({
      idUsuario: userId,
      mfaType: MfaType.TOTP,
      mfaSecret: dto.secret,
      backupCodes: [],
    });

    return { message: 'MFA activado correctamente' };
  }

  // ─────────────────────────────────────────────────────────────
  // FLUJO 6: DESACTIVAR MFA
  // ─────────────────────────────────────────────────────────────

  /**
   * Desactiva MFA tras verificar la contraseña actual del usuario.
   */
  async deactivateMfa(userId: string, dto: DeactivateMfaDto) {
    const usuario = await this.usuariosService.findById(userId);

    if (usuario.contrasenaHash) {
      const valid = await bcrypt.compare(dto.contrasena, usuario.contrasenaHash);
      if (!valid) throw new UnauthorizedException('Contraseña incorrecta');
    }

    await this.usuariosService.deleteSecurity(userId);
    return { message: 'MFA desactivado' };
  }

  // ─────────────────────────────────────────────────────────────
  // FLUJO 7: REFRESH TOKEN
  // ─────────────────────────────────────────────────────────────

  /**
   * Lee el refresh token de la httpOnly cookie (validado por JwtRefreshGuard).
   * Emite nuevo access token + rota el refresh token.
   *
   * TODO: para revocación real, guardar hash del refresh token en DB
   * y borrarlo aquí antes de emitir el nuevo.
   */
  async refresh(userId: string, correo: string, rol: UserRole, res: Response) {
    return this.issueTokens(userId, correo, rol, res);
  }

  // ─────────────────────────────────────────────────────────────
  // FLUJO 8: LOGOUT
  // ─────────────────────────────────────────────────────────────

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<{ message: string }> {
    const usuario = await this.usuariosService.findById(userId);
    const valid = await bcrypt.compare(currentPassword, usuario.contrasenaHash);
    if (!valid) throw new UnauthorizedException('Contraseña actual incorrecta');
    const contrasenaHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await this.usuariosService.save({ id: userId, contrasenaHash });
    return { message: 'Contraseña actualizada' };
  }

  async changeEmail(userId: string, newEmail: string, currentPassword: string): Promise<{ message: string }> {
    const usuario = await this.usuariosService.findById(userId);
    const valid = await bcrypt.compare(currentPassword, usuario.contrasenaHash);
    if (!valid) throw new UnauthorizedException('Contraseña incorrecta');
    const existing = await this.usuariosService.findByEmail(newEmail);
    if (existing && existing.id !== userId) throw new ConflictException('Ese correo ya está en uso');
    await this.usuariosService.save({ id: userId, correo: newEmail });
    return { message: 'Correo actualizado' };
  }

  async deleteAccount(userId: string, password: string, res: Response): Promise<void> {
    const usuario = await this.usuariosService.findById(userId);
    if (usuario.contrasenaHash) {
      const valid = await bcrypt.compare(password, usuario.contrasenaHash);
      if (!valid) throw new UnauthorizedException('Contraseña incorrecta');
    }
    await this.usuariosService.save({
      id: userId,
      correo: `deleted_${userId}@deleted.invalid`,
      nombre: 'Usuario',
      apellidos: 'eliminado',
      bio: null,
      isActive: false,
      deletedAt: new Date(),
    });
    this.logout(res);
  }

  logout(res: Response) {
    res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/v1/auth' });
    return { message: 'Sesión cerrada' };
  }

  // ─────────────────────────────────────────────────────────────
  // HELPERS PRIVADOS
  // ─────────────────────────────────────────────────────────────

  private issueTokens(userId: string, correo: string, rol: UserRole, res: Response) {
    const payload: JwtPayload = { sub: userId, email: correo, rol };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.config.get<string>('JWT_EXPIRES_IN', '15m'),
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
    });

    res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
      httpOnly: true,
      secure: this.config.get<string>('NODE_ENV') === 'production',
      sameSite: 'lax',
      path: '/api/v1/auth',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return { accessToken, userId, rol };
  }

  private signTempToken(userId: string): string {
    const payload: MfaTempPayload = { sub: userId, type: 'mfa_pending' };
    return this.jwtService.sign(payload, {
      secret: this.config.getOrThrow('JWT_SECRET'),
      expiresIn: '5m',
    });
  }
}
