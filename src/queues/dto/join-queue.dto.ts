import { IsNotEmpty, IsUUID } from 'class-validator';

export class JoinQueueDto {
  @IsNotEmpty()
  @IsUUID()
  appointmentId: string;
}
