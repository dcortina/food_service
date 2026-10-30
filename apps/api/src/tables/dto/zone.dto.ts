import {
  ApiProperty,
  ApiPropertyOptional,
  PartialType,
} from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateZoneDto {
  @ApiProperty({ example: 'Salón' })
  @IsString()
  @MinLength(2)
  nombre!: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

export class UpdateZoneDto extends PartialType(CreateZoneDto) {}
