import {
  IsInt, IsOptional, Min, IsString, IsNotEmpty, IsEmail,
  Matches, MaxLength, ValidateNested, IsDateString, IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DeliveryInfoDto {
  @ApiProperty() @IsString() @IsNotEmpty() fullName!: string;
  @ApiProperty() @IsEmail() email!: string;
  @ApiProperty() @IsString() @IsNotEmpty() address!: string;
  @ApiProperty() @IsString() @Matches(/^\d{5}$/, { message: 'Código postal inválido (5 dígitos)' }) postalCode!: string;
  @ApiProperty() @IsString() @IsNotEmpty() city!: string;
  @ApiProperty() @IsString() @IsNotEmpty() phone!: string;
  @ApiProperty() @IsDateString() deliveryDate!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) notes?: string;
}

export class BuyOperacionDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @ApiProperty({ type: DeliveryInfoDto })
  @ValidateNested()
  @Type(() => DeliveryInfoDto)
  deliveryInfo!: DeliveryInfoDto;
}
