import {
  Controller, Post, Get, Patch, Body, Res, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiCookieAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { UserRole } from '@marketplace/shared-types';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { VerifyMfaDto } from './dto/verify-mfa.dto';
import { ActivateMfaDto } from './dto/activate-mfa.dto';
import { DeactivateMfaDto } from './dto/deactivate-mfa.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ChangeEmailDto } from './dto/change-email.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { JwtRefreshGuard } from '../common/guards/jwt-refresh.guard';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Registrar nuevo usuario (cliente o empresa)' })
  @ApiResponse({ status: 201, description: 'Usuario creado — devuelve access token y setea refresh cookie' })
  @ApiResponse({ status: 409, description: 'Correo ya registrado' })
  register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    return this.authService.register(dto, res);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login con correo y contraseña' })
  @ApiResponse({ status: 200, description: 'Access token o { mfaRequired: true, tempToken }' })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas' })
  login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    return this.authService.login(dto, res);
  }

  @Post('google')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login con Google via Firebase ID token' })
  @ApiResponse({ status: 200, description: 'Access token' })
  googleLogin(@Body() dto: GoogleLoginDto, @Res({ passthrough: true }) res: Response) {
    return this.authService.googleLogin(dto, res);
  }

  @Post('mfa/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verificar código TOTP tras login con MFA activo' })
  @ApiResponse({ status: 200, description: 'Access token final' })
  @ApiResponse({ status: 401, description: 'Código incorrecto o temp token expirado' })
  verifyMfa(@Body() dto: VerifyMfaDto, @Res({ passthrough: true }) res: Response) {
    return this.authService.verifyMfa(dto, res);
  }

  @Get('mfa/setup')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener secreto TOTP y URL de QR para activar MFA' })
  @ApiResponse({ status: 200, description: 'secret + otpauthUrl para Google Authenticator' })
  setupMfa(@CurrentUser() user: CurrentUserPayload) {
    return this.authService.setupMfa(user.id);
  }

  @Post('mfa/activate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirmar activación MFA con primer código TOTP válido' })
  @ApiResponse({ status: 200, description: 'MFA activado' })
  @ApiResponse({ status: 400, description: 'Código TOTP incorrecto' })
  activateMfa(@CurrentUser() user: CurrentUserPayload, @Body() dto: ActivateMfaDto) {
    return this.authService.activateMfa(user.id, dto);
  }

  @Post('mfa/deactivate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Desactivar MFA — requiere contraseña actual' })
  @ApiResponse({ status: 200, description: 'MFA desactivado' })
  @ApiResponse({ status: 401, description: 'Contraseña incorrecta' })
  deactivateMfa(@CurrentUser() user: CurrentUserPayload, @Body() dto: DeactivateMfaDto) {
    return this.authService.deactivateMfa(user.id, dto);
  }

  @Post('refresh')
  @UseGuards(JwtRefreshGuard)
  @ApiCookieAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renovar access token usando refresh token (httpOnly cookie)' })
  @ApiResponse({ status: 200, description: 'Nuevo access token — refresh token rotado' })
  @ApiResponse({ status: 401, description: 'Refresh token inválido o expirado' })
  refresh(
    @CurrentUser() user: CurrentUserPayload & { rol: UserRole },
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.refresh(user.id, user.correo, user.rol, res);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cambiar contraseña — requiere contraseña actual' })
  @ApiResponse({ status: 200, description: 'Contraseña actualizada' })
  @ApiResponse({ status: 401, description: 'Contraseña actual incorrecta' })
  changePassword(@CurrentUser() user: CurrentUserPayload, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(user.id, dto.currentPassword, dto.newPassword);
  }

  @Patch('change-email')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cambiar correo — requiere contraseña actual' })
  @ApiResponse({ status: 200, description: 'Correo actualizado' })
  @ApiResponse({ status: 401, description: 'Contraseña incorrecta' })
  @ApiResponse({ status: 409, description: 'Correo ya en uso' })
  changeEmail(@CurrentUser() user: CurrentUserPayload, @Body() dto: ChangeEmailDto) {
    return this.authService.changeEmail(user.id, dto.newEmail, dto.currentPassword);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cerrar sesión — limpia cookie de refresh token' })
  logout(@Res({ passthrough: true }) res: Response) {
    return this.authService.logout(res);
  }
}
