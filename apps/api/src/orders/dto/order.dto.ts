import {
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';

export const CANALES = [
  'qr_mesa',
  'mostrador',
  'mesa_mesero',
  'whatsapp',
  'instagram',
  'facebook',
  'domicilio',
  'para_llevar',
] as const;

export const TIPOS_SERVICIO = [
  'mesa',
  'mostrador',
  'para_llevar',
  'domicilio',
] as const;

export class OrderCustomerDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nombre?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  telefono?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  direccion?: string;
}

export class OrderItemModifierDto {
  @ApiProperty()
  @IsUUID()
  modificadorId!: string;
}

export class OrderItemDto {
  @ApiProperty()
  @IsUUID()
  productoId!: string;

  @ApiProperty({ type: Number, default: 1 })
  @IsInt()
  @Min(1)
  cantidad!: number;

  @ApiPropertyOptional({ type: [OrderItemModifierDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemModifierDto)
  modificadores?: OrderItemModifierDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notas?: string;
}

export class CreateOrderDto {
  @ApiProperty({ enum: CANALES })
  @IsIn([...CANALES])
  canal!: (typeof CANALES)[number];

  @ApiProperty({ enum: TIPOS_SERVICIO })
  @IsIn([...TIPOS_SERVICIO])
  tipoServicio!: (typeof TIPOS_SERVICIO)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  mesaId?: string;

  @ApiPropertyOptional({ type: OrderCustomerDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => OrderCustomerDto)
  cliente?: OrderCustomerDto;

  @ApiProperty({ type: [OrderItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notas?: string;

  @ApiPropertyOptional({ example: '0.00' })
  @IsOptional()
  @Matches(/^\d+(\.\d{1,2})?$/)
  descuento?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  idempotencyKey?: string;
}
