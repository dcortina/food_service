import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, Matches } from 'class-validator';

export class PinVerifyDto {
  @ApiProperty({ example: '1234' })
  @IsString()
  @Matches(/^\d{4,8}$/)
  pin!: string;

  @ApiProperty({ example: 'pedido.cancelar' })
  @IsString()
  accion!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  entidadId?: string;
}
