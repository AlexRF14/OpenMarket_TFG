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
