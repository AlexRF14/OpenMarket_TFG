import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNotificaciones1747100000000 implements MigrationInterface {
  name = 'CreateNotificaciones1747100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE notificaciones (
        id          uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id     uuid         NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        type        varchar(50)  NOT NULL,
        title       varchar(255) NOT NULL,
        body        text         NOT NULL,
        link        varchar(500) NULL,
        read        boolean      NOT NULL DEFAULT false,
        created_at  timestamptz  NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX idx_notificaciones_user ON notificaciones(user_id, created_at DESC)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS notificaciones`);
  }
}
