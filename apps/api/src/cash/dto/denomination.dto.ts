import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Matches, Min } from 'class-validator';

export class DenominationDto {
  @ApiProperty({ example: '100.00' })
  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/)
  denominacion!: string;

  @ApiProperty({ example: 5 })
  @IsInt()
  @Min(0)
  cantidad!: number;
}
