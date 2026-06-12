import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Ahmed Updated' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;
}