import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DeactivateMfaDto {
  @ApiProperty({ description: 'Contraseña actual del usuario como confirmación' })
  @IsString()
  @MinLength(1)
  contrasena!: string;
}
