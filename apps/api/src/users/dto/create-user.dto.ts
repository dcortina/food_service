import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'Cajero Nuevo' })
  @IsString()
  @MinLength(2)
  nombre!: string;

  @ApiProperty({ example: 'cajero2' })
  @IsString()
  @MinLength(3)
  username!: string;

  @ApiProperty({ example: 'CafeQR123!' })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiPropertyOptional({ example: '1234' })
  @IsOptional()
  @Matches(/^\d{4,8}$/)
  pin?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  telefono?: string;

  @ApiProperty()
  @IsUUID()
  rolId!: string;

  @ApiProperty()
  @IsUUID()
  sucursalId!: string;
}
