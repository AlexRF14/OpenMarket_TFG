import {
  Controller, Get, Post, Patch, Body, Param, Query, UseGuards, ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { OperacionStatus } from '@marketplace/shared-types';
import { OperacionesService } from './operaciones.service';
import { CreateOperacionDto } from './dto/create-operacion.dto';
import { UpdateOperacionStatusDto } from './dto/update-operacion-status.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';

/**
 * Endpoints REST para operaciones.
 *
 * TODO: integrar con PaymentsService al confirmar (crear Stripe Checkout Session).
 * TODO: validar que sellerCompanyId/buyerCompanyId pertenezcan al usuario antes de aceptarlas.
 */
@ApiTags('operaciones')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('operaciones')
export class OperacionesController {
  constructor(private readonly service: OperacionesService) {}

  @Get('explorador')
  @ApiOperation({ summary: 'Explorador de mercado: operaciones de tipo PUBLICA' })
  @ApiResponse({ status: 200, description: 'Array de operaciones públicas' })
  findExplorador(@Query('q') q?: string) {
    return this.service.findPublic(q);
  }

  @Get('mias')
  @ApiOperation({ summary: 'Listar operaciones donde el usuario es comprador o vendedor' })
  @ApiResponse({ status: 200, description: 'Array de operaciones del usuario autenticado' })
  async findMine(
    @CurrentUser() user: CurrentUserPayload,
    @Query('side') side?: 'comprando' | 'vendiendo',
  ) {
    if (side === 'comprando') return this.service.findByComprador(user.id);
    if (side === 'vendiendo') return this.service.findByVendedor(user.id);

    const [comprando, vendiendo] = await Promise.all([
      this.service.findByComprador(user.id),
      this.service.findByVendedor(user.id),
    ]);
    // Deduplicar (poco probable pero por seguridad si fuera ambos)
    const map = new Map<string, typeof comprando[number]>();
    [...comprando, ...vendiendo].forEach((o) => map.set(o.id, o));
    return [...map.values()].sort((a, b) => +b.createdAt - +a.createdAt);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de una operación — visible para cualquier usuario autenticado' })
  @ApiResponse({ status: 200, description: 'Operación encontrada' })
  @ApiResponse({ status: 404, description: 'Operación no encontrada' })
  findById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear una operación nueva (estado pending)' })
  @ApiResponse({ status: 201, description: 'Operación creada' })
  create(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateOperacionDto) {
    const cantidad = dto.cantidad ?? 1;
    return this.service.save({
      idVendedor: user.id,
      idComprador: null,
      sellerCompanyId: dto.sellerCompanyId ?? null,
      buyerCompanyId: dto.buyerCompanyId ?? null,
      titulo: dto.titulo,
      categoria: dto.categoria,
      cantidad,
      stock: cantidad,
      operationType: dto.operationType,
      status: OperacionStatus.PENDING,
      totalAmount: dto.totalAmount,
      amountNet: dto.amountNet,
      taxAmount: dto.taxAmount,
      platformFee: dto.platformFee,
      currency: 'EUR',
      notes: dto.notes ?? null,
    });
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Cambiar el estado de una operación' })
  @ApiResponse({ status: 200, description: 'Operación actualizada' })
  async updateStatus(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateOperacionStatusDto,
  ) {
    const op = await this.service.findById(id);
    if (op.idComprador !== user.id && op.idVendedor !== user.id) {
      throw new ForbiddenException('No eres parte de esta operación');
    }
    return this.service.save({ ...op, status: dto.status });
  }
}
