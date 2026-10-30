import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'owner' })
  @IsString()
  @MinLength(3)
  username!: string;

  @ApiProperty({ example: 'CafeQR123!' })
  @IsString()
  @MinLength(8)
  password!: string;
}
