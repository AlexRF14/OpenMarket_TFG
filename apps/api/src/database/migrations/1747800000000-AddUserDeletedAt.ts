import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserDeletedAt1747800000000 implements MigrationInterface {
  name = 'AddUserDeletedAt1747800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE usuarios DROP COLUMN IF EXISTS deleted_at`);
  }
}
