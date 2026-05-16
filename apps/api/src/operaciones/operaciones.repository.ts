import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Operacion } from './entities/operacion.entity';

@Injectable()
export class OperacionesRepository {
  constructor(
    @InjectRepository(Operacion)
    private readonly repo: Repository<Operacion>,
  ) {}

  findById(id: string): Promise<Operacion | null> {
    return this.repo.findOne({ where: { id } });
  }

  findByStripeSessionId(stripeCheckoutSessionId: string): Promise<Operacion | null> {
    return this.repo.findOne({ where: { stripeCheckoutSessionId } });
  }

  findByComprador(idComprador: string): Promise<Operacion[]> {
    return this.repo.find({ where: { idComprador }, order: { createdAt: 'DESC' } });
  }

  findByVendedor(idVendedor: string): Promise<Operacion[]> {
    return this.repo.find({ where: { idVendedor }, order: { createdAt: 'DESC' } });
  }

  findPublic(q?: string): Promise<Operacion[]> {
    const qb = this.repo
      .createQueryBuilder('op')
      .where("op.operationType = 'publica'")
      .andWhere("op.status = 'confirmed'")
      .orderBy('op.createdAt', 'DESC');
    if (q) {
      const like = `%${q.toLowerCase()}%`;
      qb.andWhere('(LOWER(op.titulo) LIKE :q OR LOWER(op.notes) LIKE :q)', { q: like });
    }
    return qb.getMany();
  }

  save(operacion: Partial<Operacion>): Promise<Operacion> {
    return this.repo.save(operacion as Operacion);
  }
}
