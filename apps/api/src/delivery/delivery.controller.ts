import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { DeliveryService } from './delivery.service';
import { AssignDeliveryDto } from './dto/assign-delivery.dto';
import { CreateLiquidationDto } from './dto/create-liquidation.dto';
import { DeliverOrderDto } from './dto/deliver-order.dto';

@ApiTags('delivery')
@ApiBearerAuth()
@Controller('delivery')
export class DeliveryController {
  constructor(private readonly deliveryService: DeliveryService) {}

  @Get('orders')
  @RequirePermissions('repartidor.ver')
  listOrders(@CurrentUser() user: AuthenticatedUser) {
    return this.deliveryService.listOrders(user);
  }

  @Get('couriers')
  @RequirePermissions('repartidor.asignar')
  listCouriers(@CurrentUser() user: AuthenticatedUser) {
    return this.deliveryService.listCouriers(user);
  }

  @Post('orders/:id/assign')
  @RequirePermissions('repartidor.asignar')
  assign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignDeliveryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.deliveryService.assign(id, dto, user);
  }

  @Post('orders/:id/start')
  @RequirePermissions('pedido.ver')
  start(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.deliveryService.start(id, user);
  }

  @Post('orders/:id/deliver')
  @RequirePermissions('pedido.ver')
  deliver(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DeliverOrderDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.deliveryService.deliver(id, dto, user);
  }

  @Get('liquidations/current')
  @RequirePermissions('repartidor.ver')
  currentLiquidation(@CurrentUser() user: AuthenticatedUser) {
    return this.deliveryService.currentLiquidation(user);
  }

  @Get('liquidations')
  @RequirePermissions('repartidor.ver')
  listLiquidations(@CurrentUser() user: AuthenticatedUser) {
    return this.deliveryService.listLiquidations(user);
  }

  @Post('liquidations')
  @RequirePermissions('repartidor.liquidar')
  createLiquidation(
    @Body() dto: CreateLiquidationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.deliveryService.createLiquidation(dto, user);
  }
}
