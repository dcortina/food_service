import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { PrintJobStatusDto } from './dto/print-job-status.dto';
import { PrintAgentGuard } from './print-agent.guard';
import { PrintService } from './print.service';

@ApiTags('print')
@Public()
@UseGuards(PrintAgentGuard)
@Controller('print/jobs')
export class PrintController {
  constructor(private readonly printService: PrintService) {}

  @Get('pending')
  pending(
    @Query('negocioId', ParseUUIDPipe) negocioId: string,
    @Query('sucursalId', ParseUUIDPipe) sucursalId: string,
    @Query('limit') limit?: string,
  ) {
    const parsed = Number(limit);
    const take = Number.isFinite(parsed)
      ? Math.min(Math.max(parsed, 1), 50)
      : 20;

    return this.printService.listPending(negocioId, sucursalId, take);
  }

  @HttpCode(HttpStatus.OK)
  @Post(':id/status')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PrintJobStatusDto,
  ) {
    return this.printService.updateStatus(id, dto.estado, dto.error);
  }
}
