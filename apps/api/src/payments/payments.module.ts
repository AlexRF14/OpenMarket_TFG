import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { WebhookController } from './webhook.controller';
import { PaymentsService } from './payments.service';
import { StripeService } from './stripe.service';
import { EmpresasModule } from '../empresas/empresas.module';
import { OperacionesModule } from '../operaciones/operaciones.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [EmpresasModule, OperacionesModule, NotificationsModule],
  controllers: [PaymentsController, WebhookController],
  providers: [PaymentsService, StripeService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
