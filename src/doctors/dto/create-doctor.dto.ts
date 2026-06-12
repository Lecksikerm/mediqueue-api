import { IsNotEmpty, IsString, IsNumber, IsOptional, IsArray, Min, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateDoctorDto {
  @ApiProperty({ example: 'Cardiology' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  specialization: string;

  @ApiPropertyOptional({ example: 8 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  yearsOfExperience?: number;

  @ApiPropertyOptional({ example: 5000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  consultationFee?: number;

  @ApiPropertyOptional({ example: ['English', 'Yoruba'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  languagesSpoken?: string[];

  @ApiPropertyOptional({ example: 'Experienced cardiologist based in Ibadan' })
  @IsOptional()
  @IsString()
  bio?: string;
}