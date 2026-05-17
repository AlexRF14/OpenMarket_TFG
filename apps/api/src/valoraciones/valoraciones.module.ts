import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Valoracion } from './entities/valoracion.entity';
import { ValoracionesService } from './valoraciones.service';
import { UsuariosModule } from '../usuarios/usuarios.module';

@Module({
  imports: [TypeOrmModule.forFeature([Valoracion]), UsuariosModule],
  providers: [ValoracionesService],
  exports: [ValoracionesService],
})
export class ValoracionesModule {}
