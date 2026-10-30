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
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { CashService } from './cash.service';
import { CloseShiftDto } from './dto/close-shift.dto';
import { ListShiftsQueryDto } from './dto/list-shifts-query.dto';
import { CreateMovementDto } from './dto/movement.dto';
import { OpenShiftDto } from './dto/open-shift.dto';

@ApiTags('cash')
@ApiBearerAuth()
@Controller('cash/shifts')
export class CashController {
  constructor(private readonly cashService: CashService) {}

  @Get('current')
  @RequirePermissions('caja.ver')
  current(@CurrentUser() user: AuthenticatedUser) {
    return this.cashService.getCurrentShift(user);
  }

  @Get()
  @RequirePermissions('caja.ver')
  list(
    @Query() query: ListShiftsQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.cashService.listShifts(query, user);
  }

  @Get(':id')
  @RequirePermissions('caja.ver')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.cashService.findShift(id, user);
  }

  @Post('open')
  @RequirePermissions('caja.abrir')
  open(
    @Body() dto: OpenShiftDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.cashService.openShift(dto, user);
  }

  @Post(':id/movements')
  @RequirePermissions('caja.movimiento')
  createMovement(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateMovementDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.cashService.createMovement(id, dto, user);
  }

  @HttpCode(HttpStatus.OK)
  @Post(':id/close')
  @RequirePermissions('caja.cerrar')
  close(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CloseShiftDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.cashService.closeShift(id, dto, user);
  }
}
