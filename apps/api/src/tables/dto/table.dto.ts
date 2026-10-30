import {
  ApiProperty,
  ApiPropertyOptional,
  PartialType,
} from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsBooleanString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class CreateTableDto {
  @ApiProperty()
  @IsUUID()
  zonaId!: string;

  @ApiProperty({ example: '11' })
  @IsString()
  @MinLength(1)
  numero!: string;

  @ApiPropertyOptional({ type: Number, default: 4 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  capacidad?: number;

  @ApiPropertyOptional({
    enum: ['libre', 'ocupada', 'reservada', 'inactiva'],
    default: 'libre',
  })
  @IsOptional()
  @IsIn(['libre', 'ocupada', 'reservada', 'inactiva'])
  estado?: 'libre' | 'ocupada' | 'reservada' | 'inactiva';

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

export class UpdateTableDto extends PartialType(CreateTableDto) {}

export class ListTablesQueryDto {
  @ApiPropertyOptional({ type: Number, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ type: Number, default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 50;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  zonaId?: string;

  @ApiPropertyOptional({
    enum: ['libre', 'ocupada', 'reservada', 'inactiva'],
  })
  @IsOptional()
  @IsIn(['libre', 'ocupada', 'reservada', 'inactiva'])
  estado?: 'libre' | 'ocupada' | 'reservada' | 'inactiva';

  @ApiPropertyOptional({ enum: ['true', 'false'] })
  @IsOptional()
  @IsBooleanString()
  activo?: string;
}
