import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateBioDto {
  @ApiPropertyOptional({ description: 'Descripción del negocio o vendedor (máx 500 chars)', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string | null;
}
