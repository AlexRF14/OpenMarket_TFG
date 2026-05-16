import { IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyMfaDto {
  @ApiProperty({ description: 'Token temporal recibido en el login cuando MFA está activo' })
  @IsString()
  tempToken!: string;

  @ApiProperty({ description: 'Código TOTP de 6 dígitos de Google Authenticator', example: '123456' })
  @IsString()
  @Length(6, 6)
  code!: string;
}
