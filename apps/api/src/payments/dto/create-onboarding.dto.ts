import { IsEmail, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateOnboardingDto {
  @ApiProperty({ description: 'UUID de la empresa vendedora' })
  @IsUUID()
  empresaId!: string;

  @ApiProperty({ description: 'Email para la cuenta Express de Stripe' })
  @IsEmail()
  email!: string;
}
