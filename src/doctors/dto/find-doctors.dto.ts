import { IsOptional, IsString, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../common/pagination/pagination.dto';
import { DoctorStatus } from '../../common/enums';

export class FindDoctorsDto extends PaginationDto {
  @IsOptional()
  @IsString()
  specialization?: string;

  @IsOptional()
  @IsEnum(DoctorStatus)
  status?: DoctorStatus;

  @IsOptional()
  @Type(() => Number)
  maxFee?: number;
}
