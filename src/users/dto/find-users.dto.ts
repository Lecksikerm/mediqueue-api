import { IsOptional, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../common/pagination/pagination.dto';
import { UserRole } from '../../common/enums';

export class FindUsersDto extends PaginationDto {
  @ApiPropertyOptional({ enum: UserRole, example: UserRole.PATIENT })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  isActive?: boolean;
}