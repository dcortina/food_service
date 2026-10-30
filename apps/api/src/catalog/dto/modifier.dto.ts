import {
  ApiProperty,
  ApiPropertyOptional,
  PartialType,
} from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class CreateModifierDto {
  @ApiProperty({ example: 'Shot extra' })
  @IsString()
  @MinLength(2)
  nombre!: string;

  @ApiPropertyOptional({
    enum: ['agregar', 'quitar', 'nota'],
    default: 'agregar',
  })
  @IsOptional()
  @IsIn(['agregar', 'quitar', 'nota'])
  tipo?: 'agregar' | 'quitar' | 'nota';

  @ApiPropertyOptional({ example: '50.00' })
  @IsOptional()
  @Matches(/^\d+(\.\d{1,2})?$/)
  precioExtra?: string;

  @ApiPropertyOptional({ type: Number, default: 0 })
  @IsOptional()
  @IsInt()
  orden?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

export class CreateModifierGroupDto {
  @ApiProperty({ example: 'Tamaño' })
  @IsString()
  @MinLength(2)
  nombre!: string;

  @ApiPropertyOptional({ enum: ['unico', 'multiple'], default: 'unico' })
  @IsOptional()
  @IsIn(['unico', 'multiple'])
  tipo?: 'unico' | 'multiple';

  @ApiPropertyOptional({ type: Number, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  minSeleccion?: number;

  @ApiPropertyOptional({ type: Number, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxSeleccion?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  obligatorio?: boolean;

  @ApiPropertyOptional({ type: Number, default: 0 })
  @IsOptional()
  @IsInt()
  orden?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @ApiPropertyOptional({ type: [CreateModifierDto] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateModifierDto)
  modificadores?: CreateModifierDto[];
}

export class UpdateModifierGroupDto extends PartialType(
  CreateModifierGroupDto,
) {}

export class UpdateModifierDto extends PartialType(CreateModifierDto) {}

export class LinkModifierGroupDto {
  @ApiProperty()
  @IsUUID()
  grupoId!: string;

  @ApiPropertyOptional({ type: Number, default: 0 })
  @IsOptional()
  @IsInt()
  orden?: number;
}
