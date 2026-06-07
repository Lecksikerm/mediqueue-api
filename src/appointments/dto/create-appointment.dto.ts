import { IsNotEmpty, IsUUID, IsOptional, IsString } from 'class-validator';

export class CreateAppointmentDto {
  @IsNotEmpty()
  @IsUUID()
  doctorId: string;

  @IsNotEmpty()
  @IsUUID()
  slotId: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
