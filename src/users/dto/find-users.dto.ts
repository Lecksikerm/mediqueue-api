import { IsOptional, IsEnum } from 'class-validator';
import { PaginationDto } from '../../common/pagination/pagination.dto';
import { UserRole } from '../../common/enums';

export class FindUsersDto extends PaginationDto {
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  isActive?: boolean;
}
