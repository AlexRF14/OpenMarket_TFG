import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOperacionVisibilityFlags1747300000000 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      ALTER TABLE operaciones
        ADD COLUMN IF NOT EXISTS activa boolean NOT NULL DEFAULT true,
        ADD COLUMN IF NOT EXISTS mostrar_sin_stock boolean NOT NULL DEFAULT false
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`
      ALTER TABLE operaciones
        DROP COLUMN IF EXISTS activa,
        DROP COLUMN IF EXISTS mostrar_sin_stock
    `);
  }
}
