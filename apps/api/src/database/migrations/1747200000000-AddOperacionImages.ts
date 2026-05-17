import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOperacionImages1747200000000 implements MigrationInterface {
  name = 'AddOperacionImages1747200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE operaciones ADD COLUMN IF NOT EXISTS images text[] NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE operaciones DROP COLUMN IF EXISTS images`);
  }
}
