import { IsOptional, IsEnum } from 'class-validator';
import { PaginationDto } from '../../common/pagination/pagination.dto';
import { QueueStatus } from '../../common/enums';

export class FindQueueDto extends PaginationDto {
  @IsOptional()
  @IsEnum(QueueStatus)
  status?: QueueStatus;
}
