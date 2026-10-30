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
import {
  CreatePaymentDto,
  ListPaymentsQueryDto,
  VoidPaymentDto,
} from './dto/payment.dto';
import { PaymentsService } from './payments.service';

@ApiTags('payments')
@ApiBearerAuth()
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  @RequirePermissions('pago.registrar')
  list(
    @Query() query: ListPaymentsQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.paymentsService.list(query, user);
  }

  @Post()
  @RequirePermissions('pago.registrar')
  register(
    @Body() dto: CreatePaymentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.paymentsService.register(dto, user);
  }

  @HttpCode(HttpStatus.OK)
  @Post(':id/verify')
  @RequirePermissions('pago.registrar')
  verify(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.paymentsService.verify(id, user);
  }

  @HttpCode(HttpStatus.OK)
  @Post(':id/reconcile')
  @RequirePermissions('pago.conciliar')
  reconcile(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.paymentsService.reconcile(id, user);
  }

  @HttpCode(HttpStatus.OK)
  @Post(':id/void')
  @RequirePermissions('pago.anular')
  void(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: VoidPaymentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.paymentsService.void(id, dto, user);
  }
}
