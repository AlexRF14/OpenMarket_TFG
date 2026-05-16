import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length, Matches } from 'class-validator';

export class CreateEmpresaDto {
  @ApiProperty({ example: 'Mi Empresa, S.L.', description: 'Razón social — se persiste en empresas.nombre' })
  @IsString()
  @Length(2, 200)
  razonSocial!: string;

  @ApiProperty({ example: 'B12345678', description: 'NIF/CIF/DNI fiscal' })
  @IsString()
  @Length(2, 20)
  taxId!: string;

  @ApiPropertyOptional({ example: 'ES', description: 'Código ISO-3166 alpha-2 del país fiscal', default: 'ES' })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{2}$/, { message: 'taxCountry debe ser ISO alpha-2 (p.ej. "ES")' })
  taxCountry?: string;

  @ApiPropertyOptional({ example: 'Tecnología / Software' })
  @IsOptional()
  @IsString()
  @Length(2, 100)
  sector?: string;
}
