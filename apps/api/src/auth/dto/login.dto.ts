import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'maria@ejemplo.com' })
  @IsEmail()
  correo!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  contrasena!: string;
}
