import { IsOptional, IsString, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../common/pagination/pagination.dto';
import { DoctorStatus } from '../../common/enums';

export class FindDoctorsDto extends PaginationDto {
  @ApiPropertyOptional({ example: 'Cardiology' })
  @IsOptional()
  @IsString()
  specialization?: string;

  @ApiPropertyOptional({ enum: DoctorStatus })
  @IsOptional()
  @IsEnum(DoctorStatus)
  status?: DoctorStatus;

  @ApiPropertyOptional({ example: 5000 })
  @IsOptional()
  @Type(() => Number)
  maxFee?: number;
}