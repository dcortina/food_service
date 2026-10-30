import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  ValidateNested,
} from 'class-validator';
import { DenominationDto } from './denomination.dto';

export class CloseShiftDto {
  @ApiProperty({ example: '680.00' })
  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/)
  efectivoContado!: string;

  @ApiPropertyOptional({ type: [DenominationDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DenominationDto)
  denominaciones?: DenominationDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observaciones?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  autorizadoPorId?: string;
}
