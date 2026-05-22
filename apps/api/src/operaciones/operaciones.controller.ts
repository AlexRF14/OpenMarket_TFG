import {
  Controller, Get, Post, Patch, Body, Param, Query, UseGuards,
  ForbiddenException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { OperacionStatus } from '@marketplace/shared-types';
import { OperacionesService } from './operaciones.service';
import { CreateOperacionDto } from './dto/create-operacion.dto';
import { UpdateOperacionDto } from './dto/update-operacion.dto';
import { UpdateOperacionSettingsDto } from './dto/update-operacion-settings.dto';
import { UpdateOperacionStatusDto } from './dto/update-operacion-status.dto';
import { Compra } from '../compras/entities/compra.entity';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { NotificationsService } from '../notifications/notifications.service';
import { ValoracionesService } from '../valoraciones/valoraciones.service';
import { CreateValoracionDto } from '../valoraciones/dto/create-valoracion.dto';

@ApiTags('operaciones')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('operaciones')
export class OperacionesController {
  constructor(
    private readonly service: OperacionesService,
    private readonly notifications: NotificationsService,
    private readonly valoraciones: ValoracionesService,
    @InjectRepository(Compra) private readonly compraRepo: Repository<Compra>,
  ) {}

  @Get('explorador')
  @ApiOperation({ summary: 'Explorador de mercado: operaciones públicas activas' })
  @ApiResponse({ status: 200 })
  findExplorador(@Query('q') q?: string) {
    return this.service.findPublic(q);
  }

  @Get('mias')
  @ApiOperation({ summary: 'Listar operaciones donde el usuario es comprador o vendedor' })
  @ApiResponse({ status: 200 })
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
    const map = new Map<string, typeof comprando[number]>();
    [...comprando, ...vendiendo].forEach((o) => map.set(o.id, o));
    return [...map.values()].sort((a, b) => +b.createdAt - +a.createdAt);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'KPIs y tendencias de ventas para el vendedor (empresa)' })
  @ApiResponse({ status: 200 })
  async getDashboard(
    @CurrentUser() user: CurrentUserPayload,
    @Query('from') fromStr?: string,
    @Query('to') toStr?: string,
  ) {
    const toDate = toStr
      ? new Date(toStr + 'T23:59:59.999Z')
      : (() => { const d = new Date(); d.setHours(23, 59, 59, 999); return d; })();
    const fromDate = fromStr
      ? new Date(fromStr + 'T00:00:00.000Z')
      : new Date(toDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    const rows = await this.compraRepo
      .createQueryBuilder('c')
      .innerJoin('operaciones', 'o', 'c.operacion_id = o.id')
      .select('c.quantity', 'quantity')
      .addSelect('c.purchased_at', 'purchased_at')
      .addSelect('o.id', 'op_id')
      .addSelect('o.titulo', 'titulo')
      .addSelect('o.operation_type', 'operation_type')
      .addSelect('o.categoria', 'categoria')
      .addSelect('o.total_amount', 'total_amount')
      .where('o.id_vendedor = :sid', { sid: user.id })
      .andWhere("c.status NOT IN ('pendiente_pago', 'reembolsada')")
      .andWhere('c.purchased_at >= :from', { from: fromDate })
      .andWhere('c.purchased_at <= :to', { to: toDate })
      .getRawMany<{
        quantity: string; purchased_at: string;
        op_id: string; titulo: string; operation_type: string;
        categoria: string; total_amount: string;
      }>();

    const totalVentas = rows.length;
    const totalUnidades = rows.reduce((s, r) => s + Number(r.quantity), 0);
    const totalIngresos = rows.reduce((s, r) => s + parseFloat(r.total_amount) * Number(r.quantity), 0);

    const tipoMap = new Map<string, { ventas: number; unidades: number; ingresos: number }>();
    const catMap = new Map<string, { ventas: number; unidades: number; ingresos: number }>();
    const mesMap = new Map<string, { ventas: number; ingresos: number }>();
    const opMap = new Map<string, { titulo: string; tipo: string; ventas: number; unidades: number; ingresos: number }>();

    for (const r of rows) {
      const revenue = parseFloat(r.total_amount) * Number(r.quantity);
      const qty = Number(r.quantity);

      const tipo = r.operation_type ?? 'desconocido';
      const t = tipoMap.get(tipo) ?? { ventas: 0, unidades: 0, ingresos: 0 };
      tipoMap.set(tipo, { ventas: t.ventas + 1, unidades: t.unidades + qty, ingresos: t.ingresos + revenue });

      const cat = r.categoria ?? 'sin_categoria';
      const c = catMap.get(cat) ?? { ventas: 0, unidades: 0, ingresos: 0 };
      catMap.set(cat, { ventas: c.ventas + 1, unidades: c.unidades + qty, ingresos: c.ingresos + revenue });

      const mes = new Date(r.purchased_at).toISOString().slice(0, 7);
      const m = mesMap.get(mes) ?? { ventas: 0, ingresos: 0 };
      mesMap.set(mes, { ventas: m.ventas + 1, ingresos: m.ingresos + revenue });

      const op = opMap.get(r.op_id) ?? { titulo: r.titulo ?? r.op_id.slice(0, 8), tipo, ventas: 0, unidades: 0, ingresos: 0 };
      opMap.set(r.op_id, { ...op, ventas: op.ventas + 1, unidades: op.unidades + qty, ingresos: op.ingresos + revenue });
    }

    return {
      period: { from: fromDate.toISOString().slice(0, 10), to: toDate.toISOString().slice(0, 10) },
      kpis: {
        totalVentas,
        totalUnidades,
        totalIngresos: totalIngresos.toFixed(2),
        avgTicket: totalVentas > 0 ? (totalIngresos / totalVentas).toFixed(2) : '0.00',
      },
      porTipo: Array.from(tipoMap.entries()).map(([tipo, d]) => ({ tipo, ...d, ingresos: d.ingresos.toFixed(2) })),
      porCategoria: Array.from(catMap.entries()).map(([categoria, d]) => ({ categoria, ...d, ingresos: d.ingresos.toFixed(2) })),
      evolucionMensual: Array.from(mesMap.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([mes, d]) => ({ mes, ventas: d.ventas, ingresos: d.ingresos.toFixed(2) })),
      topOperaciones: Array.from(opMap.entries()).sort(([, a], [, b]) => b.ingresos - a.ingresos).slice(0, 5).map(([id, d]) => ({ id, ...d, ingresos: d.ingresos.toFixed(2) })),
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de una operación' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404 })
  findById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear una operación nueva (estado pending)' })
  @ApiResponse({ status: 201 })
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
      images: dto.images ?? null,
      activa: true,
      mostrarSinStock: false,
    });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Editar operación (pending: todos los campos; confirmed: solo stock)' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 403 })
  async update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateOperacionDto,
  ) {
    const op = await this.service.findById(id);
    if (op.idVendedor !== user.id) throw new ForbiddenException('Solo el vendedor puede editar');

    if (op.status === OperacionStatus.PENDING) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { stock: _stock, ...rest } = dto;
      return this.service.save({ ...op, ...rest });
    }

    if (op.status === OperacionStatus.CONFIRMED || op.status === OperacionStatus.SHIPPED) {
      if (dto.stock === undefined) return op;
      const soldUnits = op.cantidad - op.stock;
      const newCantidad = soldUnits + dto.stock;
      const newStatus = dto.stock > 0 ? OperacionStatus.CONFIRMED : (op.operationType === 'negociada' ? OperacionStatus.CONFIRMED : OperacionStatus.SHIPPED);
      return this.service.save({ ...op, stock: dto.stock, cantidad: newCantidad, status: newStatus });
    }

    throw new ForbiddenException('La operación no puede editarse en su estado actual');
  }

  @Patch(':id/settings')
  @ApiOperation({ summary: 'Ajustar visibilidad (solo vendedor, any status)' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 403 })
  async updateSettings(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateOperacionSettingsDto,
  ) {
    const op = await this.service.findById(id);
    if (op.idVendedor !== user.id) throw new ForbiddenException('Solo el vendedor puede modificar los ajustes');
    const patch: Partial<typeof op> = {};
    if (dto.activa !== undefined) patch.activa = dto.activa;
    if (dto.mostrarSinStock !== undefined) patch.mostrarSinStock = dto.mostrarSinStock;
    return this.service.save({ ...op, ...patch });
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Cambiar el estado de una operación' })
  @ApiResponse({ status: 200 })
  async updateStatus(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateOperacionStatusDto,
  ) {
    const op = await this.service.findById(id);
    if (op.idComprador !== user.id && op.idVendedor !== user.id) {
      throw new ForbiddenException('No eres parte de esta operación');
    }

    if (dto.status === OperacionStatus.COMPLETED) {
      const isBuyer = op.idComprador === user.id;
      const isSeller = op.idVendedor === user.id;
      const forceByBuyer = dto.force === true && isBuyer;

      if (!forceByBuyer) {
        if (!isSeller) throw new ForbiddenException('Solo el vendedor puede marcar como completada');
        const deliveryDate = op.deliveryInfo?.['deliveryDate'] as string | undefined;
        if (deliveryDate && new Date(deliveryDate) > new Date()) {
          throw new BadRequestException(`Fecha de entrega ${deliveryDate} aún no ha llegado`);
        }
      }
    }

    const updated = await this.service.save({ ...op, status: dto.status });
    void this.notifications.notifyStatusChanged(updated, dto.status, user.id);
    return updated;
  }

  @Get(':id/valoraciones')
  @ApiOperation({ summary: 'Listar valoraciones de una operación' })
  @ApiResponse({ status: 200 })
  getValoraciones(@Param('id') id: string) {
    return this.valoraciones.findByOperacion(id);
  }

  @Post(':id/valoraciones')
  @ApiOperation({ summary: 'Crear valoración (solo comprador, op shipped o completed)' })
  @ApiResponse({ status: 201 })
  @ApiResponse({ status: 403 })
  async createValoracion(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: CreateValoracionDto,
  ) {
    const op = await this.service.findById(id);
    // Check legacy field first, then compras table (new multi-purchase architecture)
    const isComprador = op.idComprador === user.id
      || (await this.compraRepo.count({ where: { operacionId: id, compradorId: user.id, status: Not('pendiente_pago') } })) > 0;
    if (!isComprador) throw new ForbiddenException('Solo el comprador puede valorar');
    if (['pending', 'cancelled'].includes(op.status)) {
      throw new BadRequestException('No se puede valorar una operación pendiente o cancelada');
    }
    return this.valoraciones.create(id, user.id, dto);
  }
}
