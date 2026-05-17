import { IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateOperacionSettingsDto {
  @ApiPropertyOptional({ description: 'Pausa/reactiva visibilidad en el explorador' })
  @IsOptional()
  @IsBoolean()
  activa?: boolean;

  @ApiPropertyOptional({ description: 'Mantener visible aunque el stock sea 0' })
  @IsOptional()
  @IsBoolean()
  mostrarSinStock?: boolean;
}
