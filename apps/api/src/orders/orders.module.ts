import { Module } from '@nestjs/common';
import { RealtimeModule } from '../realtime/realtime.module';
import { BusinessDayService } from './business-day.service';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { PublicOrdersController } from './public-orders.controller';

@Module({
  imports: [RealtimeModule],
  controllers: [OrdersController, PublicOrdersController],
  providers: [OrdersService, BusinessDayService],
  exports: [OrdersService],
})
export class OrdersModule {}
