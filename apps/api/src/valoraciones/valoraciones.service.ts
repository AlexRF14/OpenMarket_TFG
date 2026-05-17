import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { Valoracion } from './entities/valoracion.entity';
import { CreateValoracionDto } from './dto/create-valoracion.dto';
import { UsuariosService } from '../usuarios/usuarios.service';

@Injectable()
export class ValoracionesService {
  constructor(
    @InjectRepository(Valoracion)
    private readonly repo: Repository<Valoracion>,
    private readonly usuarios: UsuariosService,
  ) {}

  async create(operacionId: string, autorId: string, dto: CreateValoracionDto): Promise<Valoracion> {
    const user = await this.usuarios.findById(autorId).catch(() => null);
    const autorNombre = user ? `${user.nombre} ${user.apellidos}`.trim() : 'Usuario';
    try {
      return await this.repo.save({
        operacionId,
        autorId,
        autorNombre,
        puntuacion: dto.puntuacion,
        comentario: dto.comentario ?? null,
      });
    } catch (err) {
      if (err instanceof QueryFailedError) {
        const code = (err as QueryFailedError & { code?: string }).code;
        if (code === '23505') throw new ConflictException('Ya has valorado esta operación');
      }
      throw err;
    }
  }

  findByOperacion(operacionId: string): Promise<Valoracion[]> {
    return this.repo.find({ where: { operacionId }, order: { createdAt: 'DESC' } });
  }
}
