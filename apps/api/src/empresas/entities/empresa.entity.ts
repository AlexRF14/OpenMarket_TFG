import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, DeleteDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { VerifiedStatus } from '@marketplace/shared-types';
import { Usuario } from '../../usuarios/entities/usuario.entity';

@Entity('empresas')
export class Empresa {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'id_usuario', type: 'uuid' })
  idUsuario!: string;

  @Column({ type: 'varchar', length: 200 })
  nombre!: string;

  @Column({ name: 'tax_id', type: 'varchar', length: 20, unique: true })
  taxId!: string;

  @Column({ name: 'tax_country', type: 'char', length: 2 })
  taxCountry!: string;

  @Column({ name: 'vat_number', type: 'varchar', length: 30, nullable: true, default: null })
  vatNumber!: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true, default: null })
  location!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true, default: null })
  sector!: string | null;

  @Column({ name: 'logo_url', type: 'text', nullable: true, default: null })
  logoUrl!: string | null;

  @Column({ type: 'text', nullable: true, default: null })
  description!: string | null;

  @Column({ name: 'website_url', type: 'varchar', length: 255, nullable: true, default: null })
  websiteUrl!: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true, default: null })
  phone!: string | null;

  @Column({ name: 'verified_status', type: 'varchar', length: 20, default: VerifiedStatus.UNSTARTED })
  verifiedStatus!: VerifiedStatus;

  @Column({ name: 'verified_at', type: 'timestamptz', nullable: true, default: null })
  verifiedAt!: Date | null;

  // Columnas mollie_* reutilizadas para Stripe Connect sin migración.
  // TODO: renombrar a stripe_account_id / stripe_onboarding_url cuando se permita migrar.
  @Column({ name: 'mollie_account_id', type: 'varchar', length: 100, unique: true, nullable: true, default: null })
  stripeAccountId!: string | null;

  @Column({ name: 'mollie_onboarding_url', type: 'text', nullable: true, default: null })
  stripeOnboardingUrl!: string | null;

  @Column({ name: 'mollie_rejection_reason', type: 'text', nullable: true, default: null })
  stripeRejectionReason!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'id_usuario' })
  usuario!: Usuario;
}
