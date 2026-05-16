import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { UsuariosModule } from '../usuarios/usuarios.module';

@Module({
  imports: [UsuariosModule],
  controllers: [SettingsController],
  providers: [SettingsService],
})
export class SettingsModule {}
