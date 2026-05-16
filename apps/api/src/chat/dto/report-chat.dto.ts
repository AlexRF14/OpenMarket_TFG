import { IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReportChatDto {
  @ApiProperty({ example: 'El usuario está enviando contenido inapropiado.' })
  @IsString()
  @MinLength(10, { message: 'El motivo debe tener al menos 10 caracteres' })
  @MaxLength(500)
  reason!: string;
}
