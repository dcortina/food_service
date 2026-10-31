import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsUUID,
  Matches,
} from 'class-validator';

export class CreateLiquidationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  repartidorId?: string;

  @ApiProperty({ example: '280.00' })
  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/)
  totalEntregado!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observaciones?: string;
}
