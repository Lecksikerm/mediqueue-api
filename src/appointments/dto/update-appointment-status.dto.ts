import { IsEnum, IsNotEmpty } from 'class-validator';
import { AppointmentStatus } from '../../common/enums';

export class UpdateAppointmentStatusDto {
  @IsNotEmpty()
  @IsEnum(AppointmentStatus)
  status: AppointmentStatus;
}
