import { IsInt, Min, Max, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateValoracionDto {
  @ApiProperty({ description: 'Puntuación de 1 a 5', minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  puntuacion!: number;

  @ApiPropertyOptional({ description: 'Comentario opcional', maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comentario?: string;
}
