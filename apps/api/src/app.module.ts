import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { envValidationSchema } from './config/env.validation';
import { PaymentsModule } from './payments/payments.module';
import { ChatModule } from './chat/chat.module';
import { AuthModule } from './auth/auth.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { EmpresasModule } from './empresas/empresas.module';
import { ProductosModule } from './productos/productos.module';
import { OperacionesModule } from './operaciones/operaciones.module';
import { SettingsModule } from './settings/settings.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PerfilModule } from './perfil/perfil.module';
import { ComprasModule } from './compras/compras.module';

// TODO: importar cuando se implementen:
// import { VerificationModule } from './verification/verification.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
      validationSchema: envValidationSchema,
    }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST'),
        port: config.get<number>('DB_PORT'),
        username: config.get<string>('DB_USER'),
        password: config.get<string>('DB_PASSWORD'),
        database: config.get<string>('DB_NAME'),
<<<<<<< HEAD
        entities: [__dirname.replace(/\\/g, '/') + '/**/*.entity{.ts,.js}'],                                            
=======
        entities: [__dirname.replace(/\\/g, '/') + '/**/*.entity{.ts,.js}'],
>>>>>>> f346e8bb8634b7a5f25e008ef7d28bd2f6c7fdf3
        migrations: [__dirname.replace(/\\/g, '/') + '/database/migrations/*{.ts,.js}'],
        synchronize: false,   // Nunca true — BD ya existe con su DDL
        logging: config.get<string>('NODE_ENV') === 'development',
      }),
    }),

    AuthModule,
    UsuariosModule,
    EmpresasModule,
    ProductosModule,
    OperacionesModule,
    SettingsModule,
    PaymentsModule,
    ComprasModule,
    NotificationsModule,
    PerfilModule,
    ChatModule,

    // TODO: VerificationModule (KYC via Stripe Connect Express requirements/account.updated),
  ],
})
export class AppModule {}
