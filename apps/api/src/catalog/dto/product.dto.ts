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
  IsBooleanString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class ProductPriceDto {
  @ApiProperty()
  @IsUUID()
  monedaId!: string;

  @ApiProperty({ example: '250.00' })
  @Matches(/^\d+(\.\d{1,2})?$/)
  precio!: string;
}

export class CreateProductDto {
  @ApiProperty()
  @IsUUID()
  categoriaId!: string;

  @ApiProperty({ example: 'Café con leche' })
  @IsString()
  @MinLength(2)
  nombre!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  imagenUrl?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  disponible?: boolean;

  @ApiPropertyOptional({ example: '07:00' })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  disponibleDesde?: string;

  @ApiPropertyOptional({ example: '11:00' })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  disponibleHasta?: string;

  @ApiPropertyOptional({ type: [Number], example: [1, 2, 3, 4, 5] })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  diasSemana?: number[];

  @ApiPropertyOptional({ type: Number, default: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  tiempoPreparacionMin?: number;

  @ApiPropertyOptional({ example: '0.00' })
  @IsOptional()
  @Matches(/^\d+(\.\d{1,2})?$/)
  impuestoPorcentaje?: string;

  @ApiPropertyOptional({ type: Number, default: 0 })
  @IsOptional()
  @IsInt()
  orden?: number;

  @ApiProperty({ type: [ProductPriceDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ProductPriceDto)
  precios!: ProductPriceDto[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  grupoIds?: string[];
}

export class UpdateProductDto extends PartialType(CreateProductDto) {}

export class ListProductsQueryDto {
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
  categoriaId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: ['true', 'false'] })
  @IsOptional()
  @IsBooleanString()
  disponible?: string;
}
