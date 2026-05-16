import { IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/** Confirma la activación de MFA enviando el primer código TOTP válido. */
export class ActivateMfaDto {
  @ApiProperty({ description: 'Código TOTP de 6 dígitos para confirmar activación', example: '654321' })
  @IsString()
  @Length(6, 6)
  code!: string;

  @ApiProperty({ description: 'Secreto TOTP generado en el paso anterior (GET /auth/mfa/setup)' })
  @IsString()
  secret!: string;
}
