import {
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { OrderCustomerDto, OrderItemDto } from './order.dto';

export class PublicCreateOrderDto {
  @ApiProperty()
  @IsUUID()
  codigoQr!: string;

  @ApiProperty({ type: [OrderItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[];

  @ApiPropertyOptional({ type: OrderCustomerDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => OrderCustomerDto)
  cliente?: OrderCustomerDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notas?: string;

  @ApiProperty()
  @IsUUID()
  idempotencyKey!: string;
}
