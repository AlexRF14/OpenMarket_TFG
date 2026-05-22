import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCompras1747600000000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`
      CREATE TABLE IF NOT EXISTS compras (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        operacion_id uuid NOT NULL REFERENCES operaciones(id) ON DELETE CASCADE,
        comprador_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        quantity integer NOT NULL DEFAULT 1,
        delivery_info jsonb,
        purchased_at timestamptz,
        stripe_payment_intent_id varchar(100),
        stripe_checkout_session_id varchar(200),
        received_at timestamptz,
        status varchar(20) NOT NULL DEFAULT 'pendiente_pago',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS compras_comprador_idx ON compras(comprador_id);
      CREATE INDEX IF NOT EXISTS compras_operacion_idx ON compras(operacion_id);
      CREATE INDEX IF NOT EXISTS compras_session_idx ON compras(stripe_checkout_session_id);
    `);
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query(`DROP TABLE IF EXISTS compras`);
  }
}
