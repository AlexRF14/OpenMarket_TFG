import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * DataSource para TypeORM CLI (migraciones).
 * No usar synchronize:true en producción.
 * TODO: importar entidades aquí cuando se creen (users, products, orders, payments)
 */
export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 5432,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
<<<<<<< HEAD
  entities: [__dirname.replace(/\\/g, '/') + '/../**/*.entity{.ts,.js}'],                                               
=======
  entities: [__dirname.replace(/\\/g, '/') + '/../**/*.entity{.ts,.js}'],
>>>>>>> f346e8bb8634b7a5f25e008ef7d28bd2f6c7fdf3
  migrations: [__dirname.replace(/\\/g, '/') + '/../database/migrations/*{.ts,.js}'],
  synchronize: process.env.NODE_ENV === 'development',
});
