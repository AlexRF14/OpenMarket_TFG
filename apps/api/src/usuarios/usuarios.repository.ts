import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Usuario } from './entities/usuario.entity';
import { SeguridadUsuario } from './entities/seguridad-usuario.entity';

@Injectable()
export class UsuariosRepository {
  constructor(
    @InjectRepository(Usuario)
    private readonly repo: Repository<Usuario>,
    @InjectRepository(SeguridadUsuario)
    private readonly seguridadRepo: Repository<SeguridadUsuario>,
  ) {}

  /** @returns Usuario con seguridad cargada, null si no existe */
  findByEmailWithSecurity(correo: string): Promise<Usuario & { seguridad?: SeguridadUsuario } | null> {
    return this.repo
      .createQueryBuilder('u')
      .leftJoinAndMapOne('u.seguridad', SeguridadUsuario, 's', 's.idUsuario = u.id')
      .where('u.correo = :correo', { correo })
      .getOne() as Promise<(Usuario & { seguridad?: SeguridadUsuario }) | null>;
  }

  findById(id: string): Promise<Usuario | null> {
    return this.repo.findOne({ where: { id } });
  }

  findByFirebaseUid(firebaseUid: string): Promise<Usuario | null> {
    return this.repo.findOne({ where: { firebaseUid } });
  }

  findByEmail(correo: string): Promise<Usuario | null> {
    return this.repo.findOne({ where: { correo } });
  }

  /**
   * Busca vendedores con perfil público que tengan al menos una operación pública confirmada.
   * @param q Texto libre — busca por nombre, apellidos o bio (ILIKE).
   */
  searchVendedores(q?: string): Promise<Pick<Usuario, 'id' | 'nombre' | 'apellidos' | 'bio'>[]> {
    const qb = this.repo
      .createQueryBuilder('u')
      .select(['u.id', 'u.nombre', 'u.apellidos', 'u.bio'])
      .where('u.isActive = :active', { active: true })
      .andWhere(`u.settings->'privacy'->'public_profile' = 'true'::jsonb`)
      .andWhere(
        `EXISTS (SELECT 1 FROM operaciones op WHERE op.id_vendedor = u.id AND op.status = 'confirmed' AND op.operation_type = 'publica')`,
      )
      .orderBy('u.nombre', 'ASC')
      .limit(50);

    if (q) {
      const like = `%${q.toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(u.nombre) LIKE :q OR LOWER(u.apellidos) LIKE :q OR LOWER(u.bio) LIKE :q)',
        { q: like },
      );
    }

    return qb.getMany() as Promise<Pick<Usuario, 'id' | 'nombre' | 'apellidos' | 'bio'>[]>;
  }

  save(usuario: Partial<Usuario>): Promise<Usuario> {
    return this.repo.save(usuario as Usuario);
  }

  /** Guarda o actualiza el registro de seguridad. */
  saveSecurity(seguridad: Partial<SeguridadUsuario>): Promise<SeguridadUsuario> {
    return this.seguridadRepo.save(seguridad as SeguridadUsuario);
  }

  findSecurityByUserId(idUsuario: string): Promise<SeguridadUsuario | null> {
    return this.seguridadRepo.findOne({ where: { idUsuario } });
  }

  deleteSecurity(idUsuario: string): Promise<void> {
    return this.seguridadRepo.delete({ idUsuario }).then(() => undefined);
  }
}
