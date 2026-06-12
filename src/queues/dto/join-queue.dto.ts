import { IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class JoinQueueDto {
  @ApiProperty({ example: 'c974ce50-c7f0-4aa0-b85d-2b734608851c' })
  @IsNotEmpty()
  @IsUUID()
  appointmentId: string;
}