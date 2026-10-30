import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MinLength,
} from 'class-validator';

export const TIPOS_MOVIMIENTO = [
  'ingreso',
  'retiro',
  'gasto_menor',
  'devolucion_efectivo',
  'propina_efectivo',
  'ajuste',
] as const;

export class CreateMovementDto {
  @ApiProperty({ enum: TIPOS_MOVIMIENTO })
  @IsIn([...TIPOS_MOVIMIENTO])
  tipo!: (typeof TIPOS_MOVIMIENTO)[number];

  @ApiProperty({ example: '100.00' })
  @IsString()
  @Matches(/^-?\d+(\.\d{1,2})?$/)
  monto!: string;

  @ApiProperty()
  @IsString()
  @MinLength(3)
  motivo!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  autorizadoPorId?: string;
}
