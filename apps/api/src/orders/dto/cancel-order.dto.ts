import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class CancelOrderDto {
  @ApiProperty({ example: 'El cliente se retiró' })
  @IsString()
  @MinLength(3)
  motivo!: string;
}
