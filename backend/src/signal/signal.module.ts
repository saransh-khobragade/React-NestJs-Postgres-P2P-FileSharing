import { Module } from '@nestjs/common';
import { SignalGateway } from './signal.gateway';
import { RoomsService } from './rooms.service';
import { RoomsController } from './rooms.controller';

@Module({
  providers: [SignalGateway, RoomsService],
  controllers: [RoomsController],
  exports: [RoomsService],
})
export class SignalModule {}

