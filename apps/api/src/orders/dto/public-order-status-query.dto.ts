import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class PublicOrderStatusQueryDto {
  @ApiProperty()
  @IsUUID()
  codigoQr!: string;
}
