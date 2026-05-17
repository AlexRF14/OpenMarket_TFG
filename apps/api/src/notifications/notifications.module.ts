import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsService } from './notifications.service';
import { NotificacionesController } from './notificaciones.controller';
import { Notificacion } from './entities/notificacion.entity';
import { UsuariosModule } from '../usuarios/usuarios.module';

@Module({
  imports: [UsuariosModule, TypeOrmModule.forFeature([Notificacion])],
  providers: [NotificationsService],
  controllers: [NotificacionesController],
  exports: [NotificationsService],
})
export class NotificationsModule {}
