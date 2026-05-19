import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const databaseConfig = (): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: process.env.DATABASE_HOST ?? 'localhost',
  port: Number(process.env.DATABASE_PORT ?? 5432),
  username: process.env.DATABASE_USER ?? 'cpc',
  password: process.env.DATABASE_PASSWORD ?? 'cpc_dev_password',
  database: process.env.DATABASE_NAME ?? 'cpc_filling_station',
  autoLoadEntities: true,
  synchronize: false,
  migrationsRun: false,
  logging: process.env.TYPEORM_LOGGING === 'true',
});
