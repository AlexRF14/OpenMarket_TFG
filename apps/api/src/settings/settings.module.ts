import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { EmpresasModule } from '../empresas/empresas.module';
import { Operacion } from '../operaciones/entities/operacion.entity';
import { Compra } from '../compras/entities/compra.entity';
import { Valoracion } from '../valoraciones/entities/valoracion.entity';

@Module({
  imports: [
    UsuariosModule,
    EmpresasModule,
    TypeOrmModule.forFeature([Operacion, Compra, Valoracion]),
  ],
  controllers: [SettingsController],
  providers: [SettingsService],
})
export class SettingsModule {}
