import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateValoraciones1747400000000 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      CREATE TABLE IF NOT EXISTS valoraciones (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        operacion_id  UUID NOT NULL REFERENCES operaciones(id) ON DELETE CASCADE,
        autor_id      UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        autor_nombre  VARCHAR(255) NOT NULL,
        puntuacion    INT NOT NULL CHECK (puntuacion >= 1 AND puntuacion <= 5),
        comentario    TEXT NULL,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (operacion_id, autor_id)
      )
    `);
    await qr.query(`CREATE INDEX IF NOT EXISTS idx_valoraciones_operacion_id ON valoraciones(operacion_id)`);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP TABLE IF EXISTS valoraciones`);
  }
}
