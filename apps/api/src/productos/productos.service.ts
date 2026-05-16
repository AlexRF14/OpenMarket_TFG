import { Injectable, NotFoundException } from '@nestjs/common';
import { ProductosRepository } from './productos.repository';
import { Producto } from './entities/producto.entity';

/**
 * TODO: añadir filtros de búsqueda (categoría, tipo, precio, status)
 * TODO: añadir ProductosController con CRUD completo
 * TODO: integrar item_images al crear/actualizar producto
 */
@Injectable()
export class ProductosService {
  constructor(private readonly repository: ProductosRepository) {}

  async findById(id: string): Promise<Producto> {
    const producto = await this.repository.findById(id);
    if (!producto) throw new NotFoundException(`Producto ${id} no encontrado`);
    return producto;
  }

  findBySlug(slug: string): Promise<Producto | null> {
    return this.repository.findBySlug(slug);
  }

  findByEmpresa(idEmpresa: string): Promise<Producto[]> {
    return this.repository.findByEmpresa(idEmpresa);
  }

  save(data: Partial<Producto>): Promise<Producto> {
    return this.repository.save(data);
  }
}
