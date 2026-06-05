import { Repository, FindManyOptions } from 'typeorm';
import { PaginationDto } from './pagination.dto';
import { PaginatedResult } from './paginated-result.interface';

export async function paginate<T>(
  repository: Repository<T>,
  paginationDto: PaginationDto,
  options: FindManyOptions<T> = {},
): Promise<PaginatedResult<T>> {
  const page = paginationDto.page ?? 1;
  const limit = paginationDto.limit ?? 10;
  const skip = (page - 1) * limit;

  const [data, total] = await repository.findAndCount({
    ...options,
    skip,
    take: limit,
  });

  const totalPages = Math.ceil(total / limit);

  return {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
}
