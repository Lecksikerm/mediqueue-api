import { IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RescheduleAppointmentDto {
  @ApiProperty({ example: 'new-slot-uuid-here' })
  @IsNotEmpty()
  @IsUUID()
  newSlotId: string;
}