import { IsNotEmpty, IsUUID, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAppointmentDto {
  @ApiProperty({ example: 'c4cf0bcc-b7e4-4136-8d19-a03a7ff8ac14' })
  @IsNotEmpty()
  @IsUUID()
  doctorId: string;

  @ApiProperty({ example: 'ff201040-b9d9-40ac-a5f5-372766e8afed' })
  @IsNotEmpty()
  @IsUUID()
  slotId: string;

  @ApiPropertyOptional({ example: 'I have chest pain' })
  @IsOptional()
  @IsString()
  notes: string;
}