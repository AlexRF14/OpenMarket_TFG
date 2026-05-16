import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { EmpresasRepository } from './empresas.repository';
import { Empresa } from './entities/empresa.entity';
import { CreateEmpresaDto } from './dto/create-empresa.dto';

/**
 * La verificación KYB se actualiza desde PaymentsService.handleEvent (account.updated).
 */
@Injectable()
export class EmpresasService {
  constructor(private readonly repository: EmpresasRepository) {}

  async findById(id: string): Promise<Empresa> {
    const empresa = await this.repository.findById(id);
    if (!empresa) throw new NotFoundException(`Empresa ${id} no encontrada`);
    return empresa;
  }

  findByUserId(idUsuario: string): Promise<Empresa | null> {
    return this.repository.findByUserId(idUsuario);
  }

  findByStripeAccountId(stripeAccountId: string): Promise<Empresa | null> {
    return this.repository.findByStripeAccountId(stripeAccountId);
  }

  /**
   * Crea la fila `empresas` para un usuario con rol=empresa.
   * Lanza 409 si el usuario ya tiene una empresa asociada.
   */
  async createForUser(idUsuario: string, dto: CreateEmpresaDto): Promise<Empresa> {
    const existing = await this.repository.findByUserId(idUsuario);
    if (existing) {
      throw new ConflictException('El usuario ya tiene una empresa asociada');
    }
    return this.repository.save({
      idUsuario,
      nombre: dto.razonSocial,
      taxId: dto.taxId,
      taxCountry: dto.taxCountry ?? 'ES',
      sector: dto.sector ?? null,
    });
  }

  save(data: Partial<Empresa>): Promise<Empresa> {
    return this.repository.save(data);
  }
}
