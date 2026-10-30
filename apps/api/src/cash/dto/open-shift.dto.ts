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

export class OpenShiftDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  cajaId?: string;

  @ApiProperty({ example: '500.00' })
  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/)
  fondoInicial!: string;

  @ApiPropertyOptional({ type: [DenominationDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DenominationDto)
  denominaciones?: DenominationDto[];
}
