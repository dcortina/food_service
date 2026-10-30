import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiProduces, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import {
  CreateTableDto,
  ListTablesQueryDto,
  UpdateTableDto,
} from './dto/table.dto';
import { CreateZoneDto, UpdateZoneDto } from './dto/zone.dto';
import { TablesService } from './tables.service';

@ApiTags('tables')
@ApiBearerAuth()
@RequirePermissions('mesa.ver')
@Controller('tables')
export class TablesController {
  constructor(private readonly tablesService: TablesService) {}

  @Get('zones')
  listZones(@CurrentUser() user: AuthenticatedUser) {
    return this.tablesService.listZones(user);
  }

  @RequirePermissions('mesa.gestionar')
  @Post('zones')
  createZone(
    @Body() dto: CreateZoneDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tablesService.createZone(dto, user);
  }

  @RequirePermissions('mesa.gestionar')
  @Patch('zones/:id')
  updateZone(
    @Param('id') id: string,
    @Body() dto: UpdateZoneDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tablesService.updateZone(id, dto, user);
  }

  @Get()
  listTables(
    @Query() query: ListTablesQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tablesService.listTables(query, user);
  }

  @RequirePermissions('mesa.gestionar')
  @Post()
  createTable(
    @Body() dto: CreateTableDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tablesService.createTable(dto, user);
  }

  @Get(':id')
  findTable(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tablesService.findTable(id, user);
  }

  @RequirePermissions('mesa.gestionar')
  @Patch(':id')
  updateTable(
    @Param('id') id: string,
    @Body() dto: UpdateTableDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tablesService.updateTable(id, dto, user);
  }

  @RequirePermissions('mesa.gestionar')
  @Post(':id/regenerate-qr')
  regenerateQr(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tablesService.regenerateQr(id, user);
  }

  @Get(':id/qr')
  getQr(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tablesService.getQr(id, user);
  }

  @ApiProduces('image/png')
  @Get(':id/qr.png')
  async getQrPng(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() response: Response,
  ): Promise<void> {
    const { buffer, filename } = await this.tablesService.getQrPng(
      id,
      user,
    );

    response.setHeader('Content-Type', 'image/png');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`,
    );
    response.send(buffer);
  }
}
