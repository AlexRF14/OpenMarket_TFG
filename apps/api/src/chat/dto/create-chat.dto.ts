import { IsArray, IsString, ArrayMinSize, ArrayMaxSize, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export interface ParticipantDetail {
  name: string;
  type: 'user' | 'company';
  photoUrl?: string;
}

export class CreateChatDto {
  /** IDs de los participantes (userId o companyId de PostgreSQL). Mín 2, máx 2 por ahora. */
  @ApiProperty({ example: ['user_1', 'company_abc'], type: [String] })
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(2)
  @IsString({ each: true })
  participants!: string[];

  /**
   * Detalles de display — claves son UUIDs dinámicos, no se puede usar @ValidateNested
   * con forbidNonWhitelisted porque class-validator no itera Record con claves dinámicas.
   */
  @ApiProperty({ type: () => Object })
  @IsObject()
  participantDetails!: Record<string, ParticipantDetail>;

  /** Pedido relacionado (opcional). Vincula el chat a una transacción específica. */
  @ApiPropertyOptional({ example: 'order_123' })
  @IsOptional()
  @IsString()
  orderId?: string;
}
