import { IsOptional, IsDateString, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class AnalyticsQueryDto {
    @ApiPropertyOptional({ example: '2026-01-01' })
    @IsOptional()
    @IsDateString()
    from: string;

    @ApiPropertyOptional({ example: '2026-12-31' })
    @IsOptional()
    @IsDateString()
    to: string;

    @ApiPropertyOptional({ example: 'c4cf0bcc-b7e4-4136-8d19-a03a7ff8ac14' })
    @IsOptional()
    @IsUUID()
    doctorId: string;
}