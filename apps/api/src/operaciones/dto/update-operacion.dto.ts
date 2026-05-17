import { IsString, IsOptional, IsIn, IsInt, Min, Matches, MaxLength, IsArray, ArrayMaxSize } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

const NUMERIC_2DEC = /^\d+(\.\d{1,2})?$/;

const ALL_CATEGORIAS = [
  'producto', 'servicio',
  'electronica', 'hogar_jardin', 'moda_accesorios', 'alimentacion', 'deportes_ocio', 'vehiculos', 'otro_producto',
  'consultoria', 'desarrollo_software', 'diseno_grafico', 'marketing', 'educacion', 'salud', 'logistica', 'mantenimiento', 'otro_servicio',
];

export class UpdateOperacionDto {
  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  titulo?: string;

  @ApiPropertyOptional({ enum: ALL_CATEGORIAS })
  @IsOptional()
  @IsIn(ALL_CATEGORIAS)
  categoria?: string;

  @ApiPropertyOptional({ enum: ['publica', 'negociada'] })
  @IsOptional()
  @IsIn(['publica', 'negociada'])
  operationType?: 'publica' | 'negociada';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(NUMERIC_2DEC)
  totalAmount?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(NUMERIC_2DEC)
  amountNet?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(NUMERIC_2DEC)
  taxAmount?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(NUMERIC_2DEC)
  platformFee?: string;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(10)
  images?: string[];

  @ApiPropertyOptional({ description: 'Stock restante (solo cuando status=confirmed)', minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number;
}
