import {
  Entity, PrimaryColumn, Column,
  CreateDateColumn, UpdateDateColumn,
  OneToOne, JoinColumn,
} from 'typeorm';
import { MfaType } from '@marketplace/shared-types';
import { Usuario } from './usuario.entity';

@Entity('seguridad_usuarios')
export class SeguridadUsuario {
  @PrimaryColumn({ name: 'id_usuario', type: 'uuid' })
  idUsuario!: string;

  @Column({ name: 'mfa_type', type: 'varchar', length: 20, nullable: true, default: null })
  mfaType!: MfaType | null;

  @Column({ name: 'mfa_secret', type: 'text', nullable: true, default: null })
  mfaSecret!: string | null;

  @Column({ name: 'backup_codes', type: 'jsonb', default: '[]' })
  backupCodes!: string[];

  @Column({ name: 'last_mfa_login', type: 'timestamptz', nullable: true, default: null })
  lastMfaLogin!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @OneToOne(() => Usuario)
  @JoinColumn({ name: 'id_usuario' })
  usuario!: Usuario;
}
