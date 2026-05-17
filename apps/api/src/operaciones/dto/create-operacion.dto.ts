import { IsString, IsUUID, IsOptional, IsIn, IsInt, Min, Matches, MaxLength, IsArray, ArrayMaxSize } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const NUMERIC_2DEC = /^\d+(\.\d{1,2})?$/;

const ALL_CATEGORIAS = [
  'producto', 'servicio',
  'electronica', 'hogar_jardin', 'moda_accesorios', 'alimentacion', 'deportes_ocio', 'vehiculos', 'otro_producto',
  'consultoria', 'desarrollo_software', 'diseno_grafico', 'marketing', 'educacion', 'salud', 'logistica', 'mantenimiento', 'otro_servicio',
];

export class CreateOperacionDto {
  @ApiProperty({ description: 'Nombre del producto o servicio', maxLength: 200 })
  @IsString()
  @MaxLength(200)
  titulo!: string;

  @ApiProperty({ enum: ALL_CATEGORIAS })
  @IsIn(ALL_CATEGORIAS)
  categoria!: string;

  @ApiPropertyOptional({ description: 'Unidades disponibles', minimum: 1, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  cantidad?: number;

  @ApiProperty({ enum: ['publica', 'negociada'] })
  @IsIn(['publica', 'negociada'])
  operationType!: 'publica' | 'negociada';

  @ApiPropertyOptional({ description: 'UUID empresa vendedora (si aplica)' })
  @IsOptional()
  @IsUUID()
  sellerCompanyId?: string;

  @ApiPropertyOptional({ description: 'UUID empresa compradora (si aplica)' })
  @IsOptional()
  @IsUUID()
  buyerCompanyId?: string;

  @ApiProperty({ example: '125.50' })
  @IsString()
  @Matches(NUMERIC_2DEC, { message: 'totalAmount debe ser numérico con 2 decimales' })
  totalAmount!: string;

  @ApiProperty({ example: '103.72' })
  @IsString()
  @Matches(NUMERIC_2DEC)
  amountNet!: string;

  @ApiProperty({ example: '21.78' })
  @IsString()
  @Matches(NUMERIC_2DEC)
  taxAmount!: string;

  @ApiProperty({ example: '6.27' })
  @IsString()
  @Matches(NUMERIC_2DEC)
  platformFee!: string;

  @ApiPropertyOptional({ example: 'Descripción detallada del producto o servicio' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiPropertyOptional({ description: 'URLs de imágenes en Firebase Storage (máx 10)', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(10)
  images?: string[];
}
