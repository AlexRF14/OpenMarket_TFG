import {
  Controller, Get, Patch, Param, Body, Query, UseGuards, NotFoundException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UsuariosService } from '../usuarios/usuarios.service';
import { OperacionesService } from '../operaciones/operaciones.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { UpdateBioDto } from './dto/update-bio.dto';

@ApiTags('perfil')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('perfil')
export class PerfilController {
  constructor(
    private readonly usuarios: UsuariosService,
    private readonly operaciones: OperacionesService,
  ) {}

  /**
   * Busca vendedores con perfil público y ops confirmadas.
   * @param q Texto libre (nombre/apellidos/bio)
   * @returns Array de vendedores
   */
  @Get('vendedores')
  @ApiOperation({ summary: 'Buscar vendedores por nombre/bio' })
  @ApiQuery({ name: 'q', required: false })
  @ApiResponse({ status: 200, description: 'Array de vendedores' })
  searchVendedores(@Query('q') q?: string) {
    return this.usuarios.searchVendedores(q || undefined);
  }

  /**
   * Devuelve el perfil público de un usuario.
   * Si privacy.public_profile = false: muestra solo nombre, oculta bio/email/ops.
   * @param id UUID del usuario
   * @returns Perfil público o restringido
   */
  @Get(':id')
  @ApiOperation({ summary: 'Obtener perfil de un usuario' })
  @ApiResponse({ status: 200, description: 'Perfil del usuario' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async getPerfil(@Param('id') id: string) {
    const user = await this.usuarios.findById(id).catch(() => null);
    if (!user || !user.isActive) throw new NotFoundException('Usuario no encontrado');

    const s = user.settings as Record<string, unknown> | null | undefined;
    const privacy = s?.['privacy'] as Record<string, unknown> | undefined;
    const publicProfile = privacy?.['public_profile'] === true;

    if (!publicProfile) {
      return {
        id: user.id,
        nombre: user.nombre,
        apellidos: user.apellidos,
        rol: user.rol,
        correo: null,
        bio: null,
        publicProfile: false,
        operaciones: [],
      };
    }

    const ops = await this.operaciones.findPublicByVendedor(id);
    return {
      id: user.id,
      nombre: user.nombre,
      apellidos: user.apellidos,
      rol: user.rol,
      correo: user.correo,
      bio: user.bio,
      publicProfile: true,
      operaciones: ops,
    };
  }

  /**
   * Actualiza la bio del usuario autenticado.
   * @param user Usuario del token JWT
   * @param dto Bio nueva (null = eliminar)
   * @returns Bio actualizada
   */
  @Patch()
  @ApiOperation({ summary: 'Actualizar bio propia' })
  @ApiResponse({ status: 200, description: 'Bio actualizada' })
  async updateBio(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateBioDto,
  ): Promise<{ bio: string | null }> {
    const updated = await this.usuarios.updateBio(user.id, dto.bio ?? null);
    return { bio: updated.bio };
  }
}
