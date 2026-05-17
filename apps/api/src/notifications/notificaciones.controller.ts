import { Controller, Get, Patch, UseGuards, HttpCode } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';
import { Notificacion } from './entities/notificacion.entity';

@ApiTags('notificaciones')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notificaciones')
export class NotificacionesController {
  constructor(private readonly notifications: NotificationsService) {}

  /**
   * Lista las últimas 50 notificaciones del usuario, más recientes primero.
   * @returns Array de notificaciones
   */
  @Get()
  @ApiOperation({ summary: 'Listar notificaciones del usuario' })
  @ApiResponse({ status: 200, description: 'Últimas 50 notificaciones' })
  findAll(@CurrentUser() user: CurrentUserPayload): Promise<Notificacion[]> {
    return this.notifications.findByUser(user.id);
  }

  /**
   * Marca todas las notificaciones no leídas del usuario como leídas.
   */
  @Patch('read-all')
  @HttpCode(200)
  @ApiOperation({ summary: 'Marcar todas las notificaciones como leídas' })
  @ApiResponse({ status: 200 })
  async markAllRead(@CurrentUser() user: CurrentUserPayload): Promise<void> {
    await this.notifications.markAllRead(user.id);
  }
}
