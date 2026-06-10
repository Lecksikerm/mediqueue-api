import { IsOptional, IsDateString } from 'class-validator';
import { PaginationDto } from '../../common/pagination/pagination.dto';

export class AdminQueryDto extends PaginationDto {
    @IsOptional()
    @IsDateString()
    from?: string;

    @IsOptional()
    @IsDateString()
    to?: string;
}
