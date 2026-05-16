import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, DeleteDateColumn,
  OneToOne,
} from 'typeorm';
import { UserRole } from '@marketplace/shared-types';

@Entity('usuarios')
export class Usuario {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100 })
  nombre!: string;

  @Column({ type: 'varchar', length: 150 })
  apellidos!: string;

  @Column({ type: 'varchar', length: 254, unique: true })
  correo!: string;

  @Column({ name: 'contrasena_hash', type: 'varchar', length: 255 })
  contrasenaHash!: string;

  @Column({ type: 'varchar', length: 20 })
  rol!: UserRole;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'firebase_uid', type: 'varchar', length: 128, unique: true, nullable: true, default: null })
  firebaseUid!: string | null;

  @Column({ type: 'jsonb', default: '{}' })
  settings!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;

  @OneToOne('SeguridadUsuario', 'usuario', { nullable: true })
  seguridad?: unknown;
}
