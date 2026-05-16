import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GoogleLoginDto {
  @ApiProperty({ description: 'Firebase ID token obtenido en el frontend tras Google Sign-In' })
  @IsString()
  idToken!: string;
}
