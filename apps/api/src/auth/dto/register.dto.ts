import { IsEmail, IsString, MinLength, MaxLength, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'María' })
  @IsString()
  @MaxLength(100)
  nombre!: string;

  @ApiProperty({ example: 'García López' })
  @IsString()
  @MaxLength(150)
  apellidos!: string;

  @ApiProperty({ example: 'maria@ejemplo.com' })
  @IsEmail()
  correo!: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  contrasena!: string;

  @ApiProperty({ enum: ['cliente', 'empresa'] })
  @IsIn(['cliente', 'empresa'])
  rol!: 'cliente' | 'empresa';
}
