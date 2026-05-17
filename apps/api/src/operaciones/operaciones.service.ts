import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { OperacionesRepository } from './operaciones.repository';
import { Operacion } from './entities/operacion.entity';

@Injectable()
export class OperacionesService {
  constructor(private readonly repository: OperacionesRepository) {}

  async findById(id: string): Promise<Operacion> {
    const op = await this.repository.findById(id);
    if (!op) throw new NotFoundException(`Operación ${id} no encontrada`);
    return op;
  }

  findByStripeSessionId(stripeCheckoutSessionId: string): Promise<Operacion | null> {
    return this.repository.findByStripeSessionId(stripeCheckoutSessionId);
  }

  findByComprador(idComprador: string): Promise<Operacion[]> {
    return this.repository.findByComprador(idComprador);
  }

  findByVendedor(idVendedor: string): Promise<Operacion[]> {
    return this.repository.findByVendedor(idVendedor);
  }

  findPublic(q?: string): Promise<Operacion[]> {
    return this.repository.findPublic(q);
  }

  findPublicByVendedor(idVendedor: string): Promise<Operacion[]> {
    return this.repository.findPublicByVendedor(idVendedor);
  }

  async save(data: Partial<Operacion>): Promise<Operacion> {
    try {
      return await this.repository.save(data);
    } catch (err) {
      if (err instanceof QueryFailedError) {
        const constraint = (err as QueryFailedError & { constraint?: string }).constraint ?? '';
        if (constraint.includes('id_vendedor')) throw new BadRequestException('El usuario vendedor no existe');
        if (constraint.includes('id_comprador')) throw new BadRequestException('El usuario comprador no existe');
        if (constraint.includes('seller_company')) throw new BadRequestException('La empresa vendedora no existe');
        if (constraint.includes('buyer_company')) throw new BadRequestException('La empresa compradora no existe');
        if (constraint.includes('operation_type_check')) throw new BadRequestException('Tipo de operación inválido');
      }
      throw err;
    }
  }
}
