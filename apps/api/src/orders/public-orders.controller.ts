import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { PublicCreateOrderDto } from './dto/public-order.dto';
import { PublicOrderStatusQueryDto } from './dto/public-order-status-query.dto';
import { OrdersService } from './orders.service';

@ApiTags('public')
@Public()
@Controller('public/orders')
export class PublicOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  create(@Body() dto: PublicCreateOrderDto) {
    return this.ordersService.createPublicOrder(dto);
  }

  @Get(':id')
  status(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: PublicOrderStatusQueryDto,
  ) {
    return this.ordersService.getPublicOrderStatus(id, query.codigoQr);
  }
}
