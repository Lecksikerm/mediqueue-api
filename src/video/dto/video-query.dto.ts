import { IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../common/pagination/pagination.dto';
import { VideoSessionStatus } from '../../common/enums';

export class VideoQueryDto extends PaginationDto {
    @ApiPropertyOptional({ enum: VideoSessionStatus })
    @IsOptional()
    @IsEnum(VideoSessionStatus)
    status?: VideoSessionStatus;
}