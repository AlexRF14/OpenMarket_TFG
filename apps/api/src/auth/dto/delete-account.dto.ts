import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class DeleteAccountDto {
  @ApiProperty({ description: 'Contraseña actual para confirmar la eliminación' })
  @IsString()
  @IsNotEmpty()
  password!: string;
}
