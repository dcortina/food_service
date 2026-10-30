import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class UpdateBusinessDto {
  @ApiPropertyOptional({ example: 'Burger Lab' })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  nombre?: string;

  @ApiPropertyOptional({
    nullable: true,
    description:
      'Absolute http(s) URL or data URL for the business logo. Send null to remove it.',
  })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(100_000)
  logoUrl?: string | null;
}
