import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { OperacionStatus } from '@marketplace/shared-types';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { Empresa } from '../../empresas/entities/empresa.entity';

@Entity('operaciones')
export class Operacion {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'id_comprador', type: 'uuid', nullable: true, default: null })
  idComprador!: string | null;

  @Column({ name: 'id_vendedor', type: 'uuid' })
  idVendedor!: string;

  @Column({ name: 'seller_company_id', type: 'uuid', nullable: true, default: null })
  sellerCompanyId!: string | null;

  @Column({ name: 'buyer_company_id', type: 'uuid', nullable: true, default: null })
  buyerCompanyId!: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true, default: null })
  titulo!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true, default: null })
  categoria!: string | null;

  @Column({ type: 'int', default: 1 })
  cantidad!: number;

  @Column({ type: 'int', default: 1 })
  stock!: number;

  @Column({ name: 'operation_type', type: 'varchar', length: 30 })
  operationType!: 'publica' | 'negociada' | 'public_b2c' | 'public_b2b' | 'negotiated';

  @Column({ type: 'varchar', length: 30, default: OperacionStatus.PENDING })
  status!: OperacionStatus;

  @Column({ name: 'total_amount', type: 'numeric', precision: 12, scale: 2 })
  totalAmount!: string;

  @Column({ name: 'amount_net', type: 'numeric', precision: 12, scale: 2 })
  amountNet!: string;

  @Column({ name: 'tax_amount', type: 'numeric', precision: 12, scale: 2 })
  taxAmount!: string;

  @Column({ name: 'platform_fee', type: 'numeric', precision: 12, scale: 2 })
  platformFee!: string;

  @Column({ type: 'char', length: 3, default: 'EUR' })
  currency!: string;

  // Columnas mollie_* reutilizadas para Stripe Checkout sin migración.
  // mollie_payment_id ahora guarda el cs_xxx (Checkout Session) o el pi_xxx (PaymentIntent).
  @Column({ name: 'mollie_payment_id', type: 'varchar', length: 100, nullable: true, default: null })
  stripeCheckoutSessionId!: string | null;

  @Column({ name: 'mollie_payment_status', type: 'varchar', length: 50, nullable: true, default: null })
  stripePaymentStatus!: string | null;

  @Column({ name: 'id_direccion_envio', type: 'uuid', nullable: true, default: null })
  idDireccionEnvio!: string | null;

  @Column({ name: 'chat_room_id', type: 'varchar', length: 128, nullable: true, default: null })
  chatRoomId!: string | null;

  @Column({ type: 'text', nullable: true, default: null })
  notes!: string | null;

  @Column({ type: 'text', array: true, nullable: true, default: null })
  images!: string[] | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'id_comprador' })
  comprador!: Usuario | null;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'id_vendedor' })
  vendedor!: Usuario;

  @ManyToOne(() => Empresa, { nullable: true })
  @JoinColumn({ name: 'seller_company_id' })
  sellerCompany!: Empresa | null;

  @ManyToOne(() => Empresa, { nullable: true })
  @JoinColumn({ name: 'buyer_company_id' })
  buyerCompany!: Empresa | null;
}
