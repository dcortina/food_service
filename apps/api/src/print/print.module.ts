import { Module } from '@nestjs/common';
import { PrintAgentGuard } from './print-agent.guard';
import { PrintController } from './print.controller';
import { PrintService } from './print.service';

@Module({
  controllers: [PrintController],
  providers: [PrintService, PrintAgentGuard],
  exports: [PrintService],
})
export class PrintModule {}
