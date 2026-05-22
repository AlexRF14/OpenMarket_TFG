import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { Compra } from './entities/compra.entity';

@Injectable()
export class ComprasRepository {
  constructor(
    @InjectRepository(Compra) private readonly repo: Repository<Compra>,
  ) {}

  findById(id: string): Promise<Compra | null> {
    return this.repo.findOne({ where: { id }, relations: ['operacion'] });
  }

  findBySessionId(sessionId: string): Promise<Compra | null> {
    return this.repo.findOne({
      where: { stripeCheckoutSessionId: sessionId },
      relations: ['operacion'],
    });
  }

  findByComprador(compradorId: string): Promise<Compra[]> {
    return this.repo.find({
      where: { compradorId, status: Not('pendiente_pago') },
      relations: ['operacion'],
      order: { createdAt: 'DESC' },
    });
  }

  findByOperacion(operacionId: string): Promise<Compra[]> {
    return this.repo.find({
      where: { operacionId, status: Not('pendiente_pago') },
      order: { createdAt: 'DESC' },
    });
  }

  save(data: Partial<Compra>): Promise<Compra> {
    return this.repo.save(data as Compra);
  }
}
