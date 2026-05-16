import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { ProductoStatus } from '@marketplace/shared-types';
import { Empresa } from '../../empresas/entities/empresa.entity';

@Entity('productos_servicios')
export class Producto {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'id_empresa', type: 'uuid' })
  idEmpresa!: string;

  @Column({ name: 'id_categoria', type: 'uuid', nullable: true, default: null })
  idCategoria!: string | null;

  @Column({ type: 'varchar', length: 20 })
  type!: 'product' | 'service';

  @Column({ type: 'varchar', length: 200 })
  nombre!: string;

  @Column({ type: 'text', nullable: true, default: null })
  descripcion!: string | null;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  precio!: string; // numeric → string para evitar imprecisión float

  @Column({ type: 'char', length: 3, default: 'EUR' })
  currency!: string;

  @Column({ type: 'int', nullable: true, default: null })
  stock!: number | null;

  @Column({ name: 'is_negotiable', type: 'boolean', default: false })
  isNegotiable!: boolean;

  @Column({ type: 'varchar', length: 20, default: ProductoStatus.DRAFT })
  status!: ProductoStatus;

  @Column({ type: 'varchar', length: 255, unique: true, nullable: true, default: null })
  slug!: string | null;

  @Column({ name: 'min_order_qty', type: 'int', default: 1 })
  minOrderQty!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne(() => Empresa)
  @JoinColumn({ name: 'id_empresa' })
  empresa!: Empresa;
}
