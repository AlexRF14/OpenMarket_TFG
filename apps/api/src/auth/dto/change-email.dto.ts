import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangeEmailDto {
  @ApiProperty({ example: 'nuevo@ejemplo.com' })
  @IsEmail()
  newEmail!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  currentPassword!: string;
}
