import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Usuario } from './entities/usuario.entity';
import { SeguridadUsuario } from './entities/seguridad-usuario.entity';
import { UsuariosRepository } from './usuarios.repository';
import { UsuariosService } from './usuarios.service';
import { UsuariosController } from './usuarios.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Usuario, SeguridadUsuario])],
  controllers: [UsuariosController],
  providers: [UsuariosRepository, UsuariosService],
  exports: [UsuariosService],
})
export class UsuariosModule {}
