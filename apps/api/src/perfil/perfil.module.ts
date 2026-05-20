import { Module } from '@nestjs/common';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { OperacionesModule } from '../operaciones/operaciones.module';
import { EmpresasModule } from '../empresas/empresas.module';
import { PerfilController } from './perfil.controller';

@Module({
  imports: [UsuariosModule, OperacionesModule, EmpresasModule],
  controllers: [PerfilController],
})
export class PerfilModule {}
