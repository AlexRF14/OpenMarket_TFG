import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Empresa } from './entities/empresa.entity';
import { EmpresasRepository } from './empresas.repository';
import { EmpresasService } from './empresas.service';
import { EmpresasController } from './empresas.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Empresa])],
  controllers: [EmpresasController],
  providers: [EmpresasRepository, EmpresasService],
  exports: [EmpresasService],
})
export class EmpresasModule {}
