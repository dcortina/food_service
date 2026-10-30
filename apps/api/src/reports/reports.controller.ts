import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import {
  ReportRangeQueryDto,
  SalesReportQueryDto,
} from './dto/report-query.dto';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@ApiBearerAuth()
@RequirePermissions('reporte.ver')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard')
  dashboard(
    @Query() query: ReportRangeQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reportsService.getDashboard(query, user);
  }

  @Get('sales/by-channel')
  salesByChannel(
    @Query() query: ReportRangeQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reportsService.getSalesByChannel(query, user);
  }

  @Get('sales/by-product')
  salesByProduct(
    @Query() query: SalesReportQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reportsService.getTopProducts(query, user);
  }

  @Get('sales/by-cashier')
  salesByCashier(
    @Query() query: ReportRangeQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reportsService.getSalesByCashier(query, user);
  }

  @Get('sales/by-courier')
  salesByCourier(
    @Query() query: ReportRangeQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reportsService.getSalesByCourier(query, user);
  }

  @Get('cash-close/:turnoId')
  cashClose(
    @Param('turnoId', ParseUUIDPipe) turnoId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reportsService.getCashClose(turnoId, user);
  }

  @RequirePermissions('reporte.exportar')
  @Get('export/sales.csv')
  async exportSales(
    @Query() query: ReportRangeQueryDto,
    @CurrentUser() user: AuthenticatedUser,
    @Res() response: Response,
  ): Promise<void> {
    const { filename, content } =
      await this.reportsService.exportSalesCsv(query, user);

    response.setHeader(
      'Content-Type',
      'text/csv; charset=utf-8',
    );
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`,
    );
    response.send(content);
  }

  @RequirePermissions('reporte.exportar')
  @Get('export/cash-close/:turnoId.csv')
  async exportCashClose(
    @Param('turnoId', ParseUUIDPipe) turnoId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() response: Response,
  ): Promise<void> {
    const { filename, content } =
      await this.reportsService.exportCashCloseCsv(
        turnoId,
        user,
      );

    response.setHeader(
      'Content-Type',
      'text/csv; charset=utf-8',
    );
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`,
    );
    response.send(content);
  }
}
