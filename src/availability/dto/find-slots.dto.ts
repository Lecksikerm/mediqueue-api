import { IsOptional, IsDateString, IsEnum } from 'class-validator';
import { PaginationDto } from '../../common/pagination/pagination.dto';
import { SlotStatus } from '../../common/enums';

export class FindSlotsDto extends PaginationDto {
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsEnum(SlotStatus)
  status?: SlotStatus;
}
