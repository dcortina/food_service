import { Module } from '@nestjs/common';
import { PrintModule } from '../print/print.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { BusinessDayService } from './business-day.service';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { PublicOrdersController } from './public-orders.controller';

@Module({
  imports: [RealtimeModule, PrintModule],
  controllers: [OrdersController, PublicOrdersController],
  providers: [OrdersService, BusinessDayService],
  exports: [OrdersService],
})
export class OrdersModule {}
