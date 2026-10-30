import { Module } from '@nestjs/common';
import { OrdersModule } from '../orders/orders.module';
import { KdsController } from './kds.controller';

@Module({
  imports: [OrdersModule],
  controllers: [KdsController],
})
export class KdsModule {}
