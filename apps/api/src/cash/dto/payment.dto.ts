import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export const METODOS_PAGO = ['efectivo', 'transfermovil', 'enzona'] as const;
export const ESTADOS_PAGO = [
  'registrado',
  'verificado',
  'conciliado',
  'anulado',
] as const;

export class CreatePaymentDto {
  @ApiProperty()
  @IsUUID()
  pedidoId!: string;

  @ApiProperty({ enum: METODOS_PAGO })
  @IsIn([...METODOS_PAGO])
  metodo!: (typeof METODOS_PAGO)[number];

  @ApiProperty({ example: '280.00' })
  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/)
  monto!: string;

  @ApiPropertyOptional({ example: '500.00' })
  @IsOptional()
  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/)
  montoRecibido?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  referenciaExterna?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  idempotencyKey?: string;
}

export class VoidPaymentDto {
  @ApiProperty()
  @IsString()
  @MinLength(3)
  motivo!: string;
}

export class ListPaymentsQueryDto {
  @ApiPropertyOptional({ type: Number, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ type: Number, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  pedidoId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  turnoCajaId?: string;

  @ApiPropertyOptional({ enum: METODOS_PAGO })
  @IsOptional()
  @IsIn([...METODOS_PAGO])
  metodo?: (typeof METODOS_PAGO)[number];

  @ApiPropertyOptional({ enum: ESTADOS_PAGO })
  @IsOptional()
  @IsIn([...ESTADOS_PAGO])
  estado?: (typeof ESTADOS_PAGO)[number];
}
