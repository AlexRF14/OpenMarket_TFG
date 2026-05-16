import { IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { OperacionStatus } from '@marketplace/shared-types';

export class UpdateOperacionStatusDto {
  @ApiProperty({ enum: OperacionStatus })
  @IsIn(Object.values(OperacionStatus))
  status!: OperacionStatus;
}
