import { IsEmail, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCheckoutDto {
  @ApiProperty({ description: 'UUID de la operación a cobrar' })
  @IsUUID()
  operacionId!: string;

  @ApiPropertyOptional({ description: 'Email del comprador (prerellena el Checkout)' })
  @IsOptional()
  @IsEmail()
  customerEmail?: string;
}
