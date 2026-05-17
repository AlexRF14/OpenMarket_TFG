import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('notificaciones')
@Index(['userId', 'createdAt'])
export class Notificacion {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id' })
  userId!: string;

  /** 'purchase_completed' | 'new_sale' | 'status_changed' | 'new_chat' */
  @Column({ length: 50 })
  type!: string;

  @Column({ length: 255 })
  title!: string;

  @Column('text')
  body!: string;

  /** Ruta relativa del frontend, p.ej. /app/operaciones/:id */
  @Column({ type: 'varchar', length: 500, nullable: true, default: null })
  link!: string | null;

  @Column({ default: false })
  read!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
