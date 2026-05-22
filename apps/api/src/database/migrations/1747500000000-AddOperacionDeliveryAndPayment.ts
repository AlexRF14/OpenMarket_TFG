import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOperacionDeliveryAndPayment1747500000000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`
      ALTER TABLE operaciones
        ADD COLUMN IF NOT EXISTS delivery_info jsonb NULL,
        ADD COLUMN IF NOT EXISTS purchased_at timestamptz NULL,
        ADD COLUMN IF NOT EXISTS stripe_payment_intent_id varchar(100) NULL
    `);
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query(`
      ALTER TABLE operaciones
        DROP COLUMN IF EXISTS delivery_info,
        DROP COLUMN IF EXISTS purchased_at,
        DROP COLUMN IF EXISTS stripe_payment_intent_id
    `);
  }
}
