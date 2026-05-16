import { IsBoolean, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

class NotificationsDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() email?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() push?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() chat_messages?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() operations?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() marketing?: boolean;
}

class PrivacyDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() public_profile?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() allow_messages?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() show_valoraciones?: boolean;
}

class AccessibilityDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() reduce_motion?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() high_contrast?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() large_text?: boolean;
}

export class UpdateSettingsDto {
  @ApiPropertyOptional({ type: () => NotificationsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationsDto)
  notifications?: NotificationsDto;

  @ApiPropertyOptional({ type: () => PrivacyDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PrivacyDto)
  privacy?: PrivacyDto;

  @ApiPropertyOptional({ type: () => AccessibilityDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AccessibilityDto)
  accessibility?: AccessibilityDto;
}
