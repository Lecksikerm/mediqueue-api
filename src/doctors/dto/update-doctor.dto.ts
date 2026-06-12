import { IsOptional, IsString, IsNumber, IsArray, IsEnum, Min, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { DoctorStatus } from '../../common/enums';

export class UpdateDoctorDto {
  @ApiPropertyOptional({ example: 'Neurology' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  specialization?: string;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  yearsOfExperience?: number;

  @ApiPropertyOptional({ example: 7000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  consultationFee?: number;

  @ApiPropertyOptional({ example: ['English', 'Hausa'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  languagesSpoken?: string[];

  @ApiPropertyOptional({ example: 'Updated bio text' })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({ enum: DoctorStatus, example: DoctorStatus.ACTIVE })
  @IsOptional()
  @IsEnum(DoctorStatus)
  status?: DoctorStatus;
}