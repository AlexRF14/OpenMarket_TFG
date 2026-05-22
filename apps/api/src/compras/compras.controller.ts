import {
  Controller, Get, Param, Post, UseGuards,
  HttpCode, HttpStatus, ForbiddenException, NotFoundException, BadRequestException, Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { ComprasService } from './compras.service';
import { OperacionesService } from '../operaciones/operaciones.service';

@ApiTags('compras')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('compras')
export class ComprasController {
  constructor(
    private readonly compras: ComprasService,
    private readonly operaciones: OperacionesService,
  ) {}

  @Get('mias')
  @ApiOperation({ summary: 'Listar compras del comprador autenticado' })
  @ApiResponse({ status: 200 })
  async findMias(
    @CurrentUser() user: CurrentUserPayload,
    @Query('operacionId') operacionId?: string,
  ) {
    const list = await this.compras.findByComprador(user.id);
    const filtered = operacionId ? list.filter((c) => c.operacionId === operacionId) : list;
    return filtered.map((c) => this.compras.toDto(c));
  }

  @Get('operacion/:id')
  @ApiOperation({ summary: 'Listar compras de una operación (solo vendedor)' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 403 })
  async findByOperacion(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    const op = await this.operaciones.findById(id);
    if (op.idVendedor !== user.id) {
      throw new ForbiddenException('Solo el vendedor puede ver las compras de esta operación');
    }
    const list = await this.compras.findByOperacion(id);
    return list.map((c) => this.compras.toDto(c));
  }

  @Post(':id/recibir')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Comprador marca la compra como recibida (para demos)' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 403 })
  @ApiResponse({ status: 400 })
  async marcarRecibida(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    const compra = await this.compras.findById(id);
    if (!compra) throw new NotFoundException('Compra no encontrada');
    if (compra.compradorId !== user.id) {
      throw new ForbiddenException('Solo el comprador puede marcar como recibida');
    }
    if (compra.status !== 'activo') {
      throw new BadRequestException('Solo se puede marcar como recibida una compra activa');
    }
    compra.receivedAt = new Date();
    const updated = await this.compras.save(compra);
    return this.compras.toDto(updated);
  }
}
