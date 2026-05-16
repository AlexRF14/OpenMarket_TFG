import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Operacion } from './entities/operacion.entity';
import { OperacionesRepository } from './operaciones.repository';
import { OperacionesService } from './operaciones.service';
import { OperacionesController } from './operaciones.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Operacion])],
  controllers: [OperacionesController],
  providers: [OperacionesRepository, OperacionesService],
  exports: [OperacionesService],
})
export class OperacionesModule {}
