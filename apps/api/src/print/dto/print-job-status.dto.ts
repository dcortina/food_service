import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class PrintJobStatusDto {
  @ApiProperty({ enum: ['impreso', 'fallido'] })
  @IsIn(['impreso', 'fallido'])
  estado!: 'impreso' | 'fallido';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  error?: string;
}
