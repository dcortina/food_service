import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { UpdateItemStatusDto } from '../orders/dto/update-item-status.dto';
import { OrdersService } from '../orders/orders.service';

@ApiTags('kds')
@ApiBearerAuth()
@Controller('kds')
export class KdsController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get('orders')
  @RequirePermissions('kds.ver')
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.ordersService.listKdsOrders(user);
  }

  @Patch('orders/:orderId/items/:itemId/status')
  @RequirePermissions('kds.actualizar')
  updateItemStatus(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: UpdateItemStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ordersService.updateItemStatus(
      orderId,
      itemId,
      dto,
      user,
    );
  }

  @HttpCode(HttpStatus.OK)
  @Post('orders/:orderId/ready')
  @RequirePermissions('kds.actualizar')
  ready(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ordersService.markOrderReady(orderId, user);
  }
}
