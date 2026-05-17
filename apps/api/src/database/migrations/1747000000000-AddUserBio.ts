import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserBio1747000000000 implements MigrationInterface {
  name = 'AddUserBio1747000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS bio varchar(500) NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE usuarios DROP COLUMN IF EXISTS bio`);
  }
}
