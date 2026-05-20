import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { EmpresasModule } from '../empresas/empresas.module';

@Module({
  imports: [UsuariosModule, EmpresasModule],
  controllers: [SettingsController],
  providers: [SettingsService],
})
export class SettingsModule {}
