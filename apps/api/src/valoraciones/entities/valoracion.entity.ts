import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Unique, Index } from 'typeorm';

@Entity('valoraciones')
@Unique(['operacionId', 'autorId'])
export class Valoracion {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'operacion_id', type: 'uuid' })
  operacionId!: string;

  @Column({ name: 'autor_id', type: 'uuid' })
  autorId!: string;

  @Column({ name: 'autor_nombre', type: 'varchar', length: 255 })
  autorNombre!: string;

  @Column({ type: 'int' })
  puntuacion!: number;

  @Column({ type: 'text', nullable: true, default: null })
  comentario!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
