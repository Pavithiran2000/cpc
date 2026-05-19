import { ObjectLiteral, SelectQueryBuilder } from 'typeorm';
import { ListQueryDto, paginated, safeSortBy, sortDirection } from '../dto';

export interface ListQueryConfig {
  alias: string;
  searchColumns?: string[];
  statusColumn?: string;
  dateColumn?: string;
  sortColumns?: Record<string, string>;
  defaultSort?: string;
}

export async function executeListQuery<T extends ObjectLiteral>(
  qb: SelectQueryBuilder<T>,
  query: ListQueryDto,
  config: ListQueryConfig,
) {
  if (query.status && config.statusColumn) {
    qb.andWhere(`${config.statusColumn} = :status`, { status: query.status });
  }

  if (query.date_from && config.dateColumn) {
    qb.andWhere(`${config.dateColumn} >= :dateFrom`, { dateFrom: query.date_from });
  }

  if (query.date_to && config.dateColumn) {
    qb.andWhere(`${config.dateColumn} < (CAST(:dateTo AS date) + interval '1 day')`, { dateTo: query.date_to });
  }

  const search = query.search?.trim();
  if (search && config.searchColumns?.length) {
    qb.andWhere(
      config.searchColumns.map((column, index) => `${column} ILIKE :search${index}`).join(' OR '),
      Object.fromEntries(config.searchColumns.map((_column, index) => [`search${index}`, `%${search.replace(/[%_]/g, '\\$&')}%`])),
    );
  }

  const sortBy = safeSortBy(query.sort_by, config.sortColumns ?? {}, config.defaultSort ?? `${config.alias}.createdAt`);
  qb.orderBy(sortBy, sortDirection(query));

  const page = query.page ?? 1;
  const limit = query.limit ?? 25;
  qb.take(limit).skip((page - 1) * limit);

  const [data, total] = await qb.getManyAndCount();
  return paginated(data, total, query);
}
