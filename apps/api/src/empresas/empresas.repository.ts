import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Empresa } from './entities/empresa.entity';

@Injectable()
export class EmpresasRepository {
  constructor(
    @InjectRepository(Empresa)
    private readonly repo: Repository<Empresa>,
  ) {}

  findById(id: string): Promise<Empresa | null> {
    return this.repo.findOne({ where: { id } });
  }

  findByUserId(idUsuario: string): Promise<Empresa | null> {
    return this.repo.findOne({ where: { idUsuario } });
  }

  findByStripeAccountId(stripeAccountId: string): Promise<Empresa | null> {
    return this.repo.findOne({ where: { stripeAccountId } });
  }

  save(empresa: Partial<Empresa>): Promise<Empresa> {
    return this.repo.save(empresa as Empresa);
  }
}
