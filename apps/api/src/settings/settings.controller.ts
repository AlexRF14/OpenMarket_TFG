import { Controller, Get, Patch, Body, UseGuards, StreamableFile } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';

@ApiTags('settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener settings completos del usuario autenticado' })
  @ApiResponse({ status: 200, description: 'UserSettings completo con defaults aplicados' })
  getSettings(@CurrentUser() user: CurrentUserPayload) {
    return this.settingsService.getSettings(user.id);
  }

  @Patch()
  @ApiOperation({ summary: 'Actualizar settings parcialmente (deep merge)' })
  @ApiResponse({ status: 200, description: 'Settings actualizados y completos tras el merge' })
  updateSettings(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateSettingsDto,
  ) {
    return this.settingsService.updateSettings(user.id, dto);
  }

  @Get('profile')
  @ApiOperation({ summary: 'Obtener datos de perfil del usuario (nombre, correo, rol)' })
  @ApiResponse({ status: 200, description: 'Campos de perfil de la tabla usuarios' })
  getProfile(@CurrentUser() user: CurrentUserPayload) {
    return this.settingsService.getProfile(user.id);
  }

  @Get('export')
  @ApiOperation({ summary: 'Exportar datos personales en ZIP (RGPD)' })
  @ApiResponse({ status: 200, description: 'ZIP con perfil, operaciones, compras y valoraciones' })
  async exportData(@CurrentUser() user: CurrentUserPayload): Promise<StreamableFile> {
    const buffer = await this.settingsService.exportUserData(user.id);
    return new StreamableFile(buffer, {
      type: 'application/zip',
      disposition: 'attachment; filename="mis-datos-openmarket.zip"',
    });
  }
}
