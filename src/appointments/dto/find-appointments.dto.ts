import { IsOptional, IsEnum, IsDateString } from 'class-validator';
import { PaginationDto } from '../../common/pagination/pagination.dto';
import { AppointmentStatus } from '../../common/enums';

export class FindAppointmentsDto extends PaginationDto {
  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;

  @IsOptional()
  @IsDateString()
  date?: string;
}
