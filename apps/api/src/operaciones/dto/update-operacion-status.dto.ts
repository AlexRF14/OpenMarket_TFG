import { IsIn, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OperacionStatus } from '@marketplace/shared-types';

export class UpdateOperacionStatusDto {
  @ApiProperty({ enum: OperacionStatus })
  @IsIn(Object.values(OperacionStatus))
  status!: OperacionStatus;

  /** Solo para demos: si true y el caller es el comprador, omite la validación de fecha de entrega. */
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  force?: boolean;
}
