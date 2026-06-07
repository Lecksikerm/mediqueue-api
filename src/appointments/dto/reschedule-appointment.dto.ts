import { IsNotEmpty, IsUUID } from 'class-validator';

export class RescheduleAppointmentDto {
  @IsNotEmpty()
  @IsUUID()
  newSlotId: string;
}
