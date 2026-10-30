import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class UpdateItemStatusDto {
  @ApiProperty({ enum: ['en_preparacion', 'listo'] })
  @IsIn(['en_preparacion', 'listo'])
  estado!: 'en_preparacion' | 'listo';
}
