import { ApiPropertyOptional } from '@nestjs/swagger';
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
} from 'class-validator';
import { CANALES } from './order.dto';

export const ESTADOS_PEDIDO = [
  'nuevo',
  'confirmado',
  'en_preparacion',
  'listo',
  'entregado',
  'cancelado',
] as const;

export class ListOrdersQueryDto {
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

  @ApiPropertyOptional({ enum: ESTADOS_PEDIDO })
  @IsOptional()
  @IsIn([...ESTADOS_PEDIDO])
  estado?: (typeof ESTADOS_PEDIDO)[number];

  @ApiPropertyOptional({ enum: CANALES })
  @IsOptional()
  @IsIn([...CANALES])
  canal?: (typeof CANALES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  mesaId?: string;

  @ApiPropertyOptional({ example: '2026-10-30' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  fecha?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}
