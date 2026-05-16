import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Producto } from './entities/producto.entity';
import { ProductosRepository } from './productos.repository';
import { ProductosService } from './productos.service';

@Module({
  imports: [TypeOrmModule.forFeature([Producto])],
  providers: [ProductosRepository, ProductosService],
  exports: [ProductosService],
})
export class ProductosModule {}
