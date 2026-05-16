import { Body, Controller, ForbiddenException, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@marketplace/shared-types';
import { EmpresasService } from './empresas.service';
import { CreateEmpresaDto } from './dto/create-empresa.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';

@ApiTags('empresas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('empresas')
export class EmpresasController {
  constructor(private readonly empresas: EmpresasService) {}

  @Post()
  @ApiOperation({ summary: 'Crear la empresa del usuario autenticado' })
  @ApiResponse({ status: 201, description: 'Empresa creada — devuelve la entidad completa' })
  @ApiResponse({ status: 403, description: 'El usuario no tiene rol empresa' })
  @ApiResponse({ status: 409, description: 'El usuario ya tiene una empresa asociada' })
  async create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateEmpresaDto,
  ) {
    if (user.rol !== UserRole.EMPRESA) {
      throw new ForbiddenException('Sólo cuentas con rol empresa pueden crear una empresa');
    }
    return this.empresas.createForUser(user.id, dto);
  }

  @Get('mia')
  @ApiOperation({ summary: 'Empresa asociada al usuario autenticado (si existe)' })
  @ApiResponse({ status: 200, description: 'Empresa o null' })
  findMine(@CurrentUser() user: CurrentUserPayload) {
    return this.empresas.findByUserId(user.id);
  }
}
