import { Module } from '@nestjs/common';
import { BusinessDayService } from '../orders/business-day.service';
import { CashController } from './cash.controller';
import { CashService } from './cash.service';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  controllers: [CashController, PaymentsController],
  providers: [CashService, PaymentsService, BusinessDayService],
})
export class CashModule {}
