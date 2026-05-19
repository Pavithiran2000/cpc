import { Transform } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class PageQueryDto {
  @IsOptional()
  @Transform(({ value }) => Number(value ?? 1))
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Transform(({ value }) => Number(value ?? 25))
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 25;
}

export class ListQueryDto extends PageQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsDateString()
  date_from?: string;

  @IsOptional()
  @IsDateString()
  date_to?: string;

  @IsOptional()
  @IsString()
  sort_by?: string;

  @IsOptional()
  @IsIn(['ASC', 'DESC', 'asc', 'desc'])
  sort_order?: 'ASC' | 'DESC' | 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_previous: boolean;
  };
}

export function pageOptions(query: PageQueryDto) {
  const page = query.page ?? 1;
  const limit = query.limit ?? 25;
  return {
    take: limit,
    skip: (page - 1) * limit,
  };
}

export function paginationMeta(query: PageQueryDto, total: number): PaginatedResult<unknown>['meta'] {
  const page = query.page ?? 1;
  const limit = query.limit ?? 25;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return {
    page,
    limit,
    total,
    total_pages: totalPages,
    has_next: page < totalPages,
    has_previous: page > 1,
  };
}

export function paginated<T>(data: T[], total: number, query: PageQueryDto): PaginatedResult<T> {
  return {
    data,
    meta: paginationMeta(query, total),
  };
}

export function sortDirection(query: ListQueryDto): 'ASC' | 'DESC' {
  return query.sort_order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
}

export function safeSortBy(value: string | undefined, allowed: Record<string, string>, fallback: string): string {
  if (!value) return fallback;
  return allowed[value] ?? fallback;
}
