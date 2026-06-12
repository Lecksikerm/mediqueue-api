import { IsNotEmpty, IsString, IsOptional, IsBoolean, IsDateString, Matches, IsArray, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

enum RecurrenceDay {
  MON = 'MON', TUE = 'TUE', WED = 'WED',
  THU = 'THU', FRI = 'FRI', SAT = 'SAT', SUN = 'SUN',
}

export class CreateSlotDto {
  @ApiProperty({ example: '2026-06-15' })
  @IsNotEmpty()
  @IsDateString()
  date: string;

  @ApiProperty({ example: '09:00' })
  @IsNotEmpty()
  @IsString()
  @Matches(/^([0-1]\d|2[0-3]):([0-5]\d)$/, {
    message: 'startTime must be in HH:MM format',
  })
  startTime: string;

  @ApiProperty({ example: '09:30' })
  @IsNotEmpty()
  @IsString()
  @Matches(/^([0-1]\d|2[0-3]):([0-5]\d)$/, {
    message: 'endTime must be in HH:MM format',
  })
  endTime: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isRecurring?: boolean;

  @ApiPropertyOptional({ enum: RecurrenceDay, isArray: true, example: ['MON', 'WED', 'FRI'] })
  @IsOptional()
  @IsArray()
  @IsEnum(RecurrenceDay, { each: true })
  recurrenceDays?: RecurrenceDay[];
}