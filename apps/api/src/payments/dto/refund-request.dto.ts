import { IsString, IsNotEmpty, MaxLength, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class RefundRequestDto {
  @ApiPropertyOptional({ description: 'Motivo de la solicitud de reembolso (requerido en B2B/C2C)', maxLength: 1000 })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  reason?: string;
}
