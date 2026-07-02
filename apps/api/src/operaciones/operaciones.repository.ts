import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OperacionStatus } from '@marketplace/shared-types';
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
      .andWhere('op.activa = true')
      .andWhere("((op.status = 'confirmed' AND op.stock > 0) OR (op.status = 'shipped' AND op.mostrar_sin_stock = true))")
      .orderBy('op.createdAt', 'DESC');
    if (q) {
      const like = `%${q.toLowerCase()}%`;
      qb.andWhere('(LOWER(op.titulo) LIKE :q OR LOWER(op.notes) LIKE :q)', { q: like });
    }
    return qb.getMany();
  }

  findPublicByVendedor(idVendedor: string): Promise<Operacion[]> {
    return this.repo.find({
      where: { idVendedor, status: OperacionStatus.CONFIRMED, operationType: 'publica' },
      order: { createdAt: 'DESC' },
    });
  }

  save(operacion: Partial<Operacion>): Promise<Operacion> {
    return this.repo.save(operacion as Operacion);
  }

  /**
   * Decrementa stock de forma atómica: `UPDATE ... WHERE stock >= qty RETURNING stock`.
   * Evita overselling por condición de carrera entre compradores concurrentes.
   * Devuelve el stock restante, o null si no había suficiente (0 filas afectadas).
   */
  async decrementStock(id: string, qty: number): Promise<number | null> {
    const result = await this.repo
      .createQueryBuilder()
      .update(Operacion)
      .set({ stock: () => 'stock - :qty' })
      .where('id = :id', { id })
      .andWhere('stock >= :qty', { qty })
      .returning(['stock'])
      .execute();

    if (!result.affected) return null;
    const raw = result.raw as Array<{ stock: number }>;
    return raw[0]?.stock ?? null;
  }
}
