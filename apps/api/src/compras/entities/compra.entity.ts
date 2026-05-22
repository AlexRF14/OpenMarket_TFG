import {
  Column, CreateDateColumn, Entity, JoinColumn,
  ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { Operacion } from '../../operaciones/entities/operacion.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';

export type CompraStatus = 'pendiente_pago' | 'activo' | 'reembolsada';

@Entity('compras')
export class Compra {
  @PrimaryGeneratedColumn('uuid') id!: string;

  @Column({ name: 'operacion_id', type: 'uuid' }) operacionId!: string;
  @Column({ name: 'comprador_id', type: 'uuid' }) compradorId!: string;
  @Column({ type: 'integer', default: 1 }) quantity!: number;

  @Column({ name: 'delivery_info', type: 'jsonb', nullable: true, default: null })
  deliveryInfo!: Record<string, unknown> | null;

  @Column({ name: 'purchased_at', type: 'timestamptz', nullable: true, default: null })
  purchasedAt!: Date | null;

  @Column({ name: 'stripe_payment_intent_id', type: 'varchar', length: 100, nullable: true, default: null })
  stripePaymentIntentId!: string | null;

  @Column({ name: 'stripe_checkout_session_id', type: 'varchar', length: 200, nullable: true, default: null })
  stripeCheckoutSessionId!: string | null;

  @Column({ name: 'received_at', type: 'timestamptz', nullable: true, default: null })
  receivedAt!: Date | null;

  @Column({ type: 'varchar', length: 20, default: 'pendiente_pago' })
  status!: CompraStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt!: Date;

  @ManyToOne(() => Operacion, { nullable: false })
  @JoinColumn({ name: 'operacion_id' })
  operacion!: Operacion;

  @ManyToOne(() => Usuario, { nullable: false })
  @JoinColumn({ name: 'comprador_id' })
  comprador!: Usuario;
}
