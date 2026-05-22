import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Compra } from './entities/compra.entity';
import { ComprasRepository } from './compras.repository';
import { ComprasService } from './compras.service';
import { ComprasController } from './compras.controller';
import { OperacionesModule } from '../operaciones/operaciones.module';

@Module({
  imports: [TypeOrmModule.forFeature([Compra]), OperacionesModule],
  controllers: [ComprasController],
  providers: [ComprasRepository, ComprasService],
  exports: [ComprasService],
})
export class ComprasModule {}
