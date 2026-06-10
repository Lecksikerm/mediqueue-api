import { IsOptional, IsDateString, IsUUID } from 'class-validator';

export class AnalyticsQueryDto {
    @IsOptional()
    @IsDateString()
    from?: string;

    @IsOptional()
    @IsDateString()
    to?: string;

    @IsOptional()
    @IsUUID()
    doctorId?: string;
}