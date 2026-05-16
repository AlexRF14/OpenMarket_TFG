import { Controller, Get, NotFoundException, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UsuariosService } from './usuarios.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';

@ApiTags('usuarios')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuarios: UsuariosService) {}

  /**
   * Busca un usuario por correo para iniciar un chat.
   * Solo devuelve datos públicos mínimos — nunca el hash de contraseña ni settings.
   * TODO: respetar privacy.allow_messages cuando esté implementado en settings.
   * @param correo Correo del usuario a buscar
   * @returns Datos públicos o 404
   */
  @Get('buscar')
  @ApiOperation({ summary: 'Buscar usuario por correo para iniciar chat' })
  @ApiQuery({ name: 'correo', description: 'Correo electrónico del usuario' })
  @ApiResponse({ status: 200, description: '{ id, nombre, apellidos, rol }' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async buscarPorCorreo(
    @CurrentUser() requester: CurrentUserPayload,
    @Query('correo') correo: string,
  ): Promise<{ id: string; nombre: string; apellidos: string; rol: string }> {
    if (!correo?.trim()) throw new NotFoundException('Correo requerido');
    if (correo.trim().toLowerCase() === requester.correo.toLowerCase()) {
      throw new NotFoundException('No puedes chatear contigo mismo');
    }
    const user = await this.usuarios.findByEmail(correo.trim().toLowerCase());
    if (!user || !user.isActive) throw new NotFoundException('Usuario no encontrado');
    return { id: user.id, nombre: user.nombre, apellidos: user.apellidos, rol: user.rol };
  }
}
