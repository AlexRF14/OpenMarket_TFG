import { IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiProperty({ example: 'Hola, ¿el producto sigue disponible?' })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  text!: string;

  /** ID del remitente (userId o companyId de PostgreSQL). */
  @ApiProperty({ example: 'user_123' })
  @IsString()
  senderId!: string;
}
