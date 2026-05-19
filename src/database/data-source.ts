import 'reflect-metadata';
import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { entities } from './entities';

config();

export default new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST ?? 'localhost',
  port: Number(process.env.DATABASE_PORT ?? 5432),
  username: process.env.DATABASE_USER ?? 'cpc',
  password: process.env.DATABASE_PASSWORD ?? 'cpc_dev_password',
  database: process.env.DATABASE_NAME ?? 'cpc_filling_station',
  synchronize: false,
  logging: process.env.TYPEORM_LOGGING === 'true',
  entities,
  migrations: ['src/database/migrations/*.ts'],
});
