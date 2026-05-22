import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCompraRefundReason1747700000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE compras ADD COLUMN IF NOT EXISTS refund_reason varchar(1000) NULL`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE compras DROP COLUMN IF EXISTS refund_reason`);
  }
}
