import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { FirebaseAdminService } from './firebase-admin.service';

@Module({
  controllers: [ChatController],
  providers: [ChatService, FirebaseAdminService],
  exports: [FirebaseAdminService],
})
export class ChatModule {}
