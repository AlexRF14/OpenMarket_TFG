import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Operacion } from './entities/operacion.entity';
import { Compra } from '../compras/entities/compra.entity';
import { OperacionesRepository } from './operaciones.repository';
import { OperacionesService } from './operaciones.service';
import { OperacionesController } from './operaciones.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { ValoracionesModule } from '../valoraciones/valoraciones.module';

@Module({
  imports: [TypeOrmModule.forFeature([Operacion, Compra]), NotificationsModule, ValoracionesModule],
  controllers: [OperacionesController],
  providers: [OperacionesRepository, OperacionesService],
  exports: [OperacionesService],
})
export class OperacionesModule {}
