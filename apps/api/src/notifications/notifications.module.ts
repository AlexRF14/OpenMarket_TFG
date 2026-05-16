import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { UsuariosModule } from '../usuarios/usuarios.module';

@Module({
  imports: [UsuariosModule],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
