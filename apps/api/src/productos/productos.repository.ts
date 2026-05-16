import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Producto } from './entities/producto.entity';

@Injectable()
export class ProductosRepository {
  constructor(
    @InjectRepository(Producto)
    private readonly repo: Repository<Producto>,
  ) {}

  findById(id: string): Promise<Producto | null> {
    return this.repo.findOne({ where: { id } });
  }

  findBySlug(slug: string): Promise<Producto | null> {
    return this.repo.findOne({ where: { slug } });
  }

  findByEmpresa(idEmpresa: string): Promise<Producto[]> {
    return this.repo.find({ where: { idEmpresa } });
  }

  save(producto: Partial<Producto>): Promise<Producto> {
    return this.repo.save(producto as Producto);
  }
}
