import { Injectable, NotFoundException } from '@nestjs/common';
import { UsuariosRepository } from './usuarios.repository';
import { Usuario } from './entities/usuario.entity';
import { SeguridadUsuario } from './entities/seguridad-usuario.entity';

/**
 * Servicio de usuarios — solo gestión de datos.
 * La lógica de autenticación vive en AuthModule.
 * TODO: añadir paginación en findAll cuando se implemente el panel admin
 */
@Injectable()
export class UsuariosService {
  constructor(private readonly repository: UsuariosRepository) {}

  /**
   * @throws NotFoundException si no existe
   */
  async findById(id: string): Promise<Usuario> {
    const usuario = await this.repository.findById(id);
    if (!usuario) throw new NotFoundException(`Usuario ${id} no encontrado`);
    return usuario;
  }

  findByEmail(correo: string): Promise<Usuario | null> {
    return this.repository.findByEmail(correo);
  }

  findByFirebaseUid(firebaseUid: string): Promise<Usuario | null> {
    return this.repository.findByFirebaseUid(firebaseUid);
  }

  findByEmailWithSecurity(correo: string) {
    return this.repository.findByEmailWithSecurity(correo);
  }

  save(data: Partial<Usuario>): Promise<Usuario> {
    return this.repository.save(data);
  }

  saveSecurity(data: Partial<SeguridadUsuario>): Promise<SeguridadUsuario> {
    return this.repository.saveSecurity(data);
  }

  findSecurityByUserId(idUsuario: string): Promise<SeguridadUsuario | null> {
    return this.repository.findSecurityByUserId(idUsuario);
  }

  deleteSecurity(idUsuario: string): Promise<void> {
    return this.repository.deleteSecurity(idUsuario);
  }
}
