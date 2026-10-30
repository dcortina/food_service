import { Module } from '@nestjs/common';
import { CashModule } from '../cash/cash.module';
import { BusinessDayService } from '../orders/business-day.service';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [CashModule],
  controllers: [ReportsController],
  providers: [ReportsService, BusinessDayService],
})
export class ReportsModule {}
