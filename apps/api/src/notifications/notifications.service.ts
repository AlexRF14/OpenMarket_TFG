import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { UsuariosService } from '../usuarios/usuarios.service';
import type { Operacion } from '../operaciones/entities/operacion.entity';
import { Notificacion } from './entities/notificacion.entity';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly usuarios: UsuariosService,
    @InjectRepository(Notificacion)
    private readonly notiRepo: Repository<Notificacion>,
  ) {
    const host = config.get<string>('SMTP_HOST');
    const user = config.get<string>('SMTP_USER');
    const pass = config.get<string>('SMTP_PASS');
    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port: config.get<number>('SMTP_PORT') ?? 587,
        secure: (config.get<number>('SMTP_PORT') ?? 587) === 465,
        auth: { user, pass },
      });
      this.logger.log(`SMTP configured → ${host}`);
    } else {
      this.logger.warn('SMTP not configured — email notifications disabled');
    }
  }

  // ── In-app notifications ─────────────────────────────────────────────────────

  /** Crea una notificación in-app persistida en BD. */
  async createInApp(
    userId: string,
    type: string,
    title: string,
    body: string,
    link?: string,
  ): Promise<void> {
    await this.notiRepo.save({ userId, type, title, body, link: link ?? null, read: false });
  }

  /** Últimas 50 notificaciones del usuario, más recientes primero. */
  findByUser(userId: string): Promise<Notificacion[]> {
    return this.notiRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  /** Marca todas las notificaciones del usuario como leídas. */
  async markAllRead(userId: string): Promise<void> {
    await this.notiRepo.update({ userId, read: false }, { read: true });
  }

  // ── Email + in-app combined ───────────────────────────────────────────────────

  /** Notifica (email + in-app) al comprador y al vendedor cuando se completa un pago. */
  async notifyPurchaseCompleted(op: Operacion): Promise<void> {
    const [buyer, seller] = await Promise.all([
      op.idComprador ? this.usuarios.findById(op.idComprador).catch(() => null) : null,
      op.idVendedor ? this.usuarios.findById(op.idVendedor).catch(() => null) : null,
    ]);

    const opTitle = op.titulo ?? 'Oferta';
    const amount = `${op.totalAmount} ${op.currency}`;
    const frontendUrl = this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';
    const opUrl = `${frontendUrl}/app/operaciones/${op.id}`;
    const opPath = `/app/operaciones/${op.id}`;

    if (op.idComprador) {
      void this.createInApp(
        op.idComprador,
        'purchase_completed',
        'Pago completado',
        `Tu pago para "${opTitle}" (${amount}) se procesó correctamente.`,
        opPath,
      ).catch(() => undefined);

      void this.createInApp(
        op.idComprador,
        'rate_invite',
        '¿Cómo fue tu experiencia?',
        `Puntúa y comenta "${opTitle}" para ayudar a otros compradores.`,
        opPath,
      ).catch(() => undefined);
    }

    if (op.idVendedor) {
      const buyerName = buyer ? `${buyer.nombre} ${buyer.apellidos}`.trim() : 'Un comprador';
      void this.createInApp(
        op.idVendedor,
        'new_sale',
        'Nueva venta',
        `${buyerName} compró "${opTitle}" por ${amount}.`,
        opPath,
      ).catch(() => undefined);
    }

    if (buyer && this.isEmailEnabled(buyer)) {
      await this.send(
        buyer.correo,
        `✅ Pago completado — ${opTitle}`,
        this.tmpl(
          `Tu pago para <strong>${opTitle}</strong> por <strong>${amount}</strong> se ha procesado correctamente.`,
          opUrl,
        ),
      );
    }

    if (seller && this.isEmailEnabled(seller)) {
      const buyerName = buyer ? `${buyer.nombre} ${buyer.apellidos}`.trim() : 'Un comprador';
      await this.send(
        seller.correo,
        `🎉 Nueva venta — ${opTitle}`,
        this.tmpl(
          `<strong>${buyerName}</strong> ha comprado <strong>${opTitle}</strong> por <strong>${amount}</strong>.`,
          opUrl,
        ),
      );
    }
  }

  /** Notifica (email + in-app) a la otra parte cuando cambia el estado de una operación. */
  async notifyStatusChanged(op: Operacion, newStatus: string, initiatorId: string): Promise<void> {
    const otherId = op.idVendedor === initiatorId ? op.idComprador : op.idVendedor;
    if (!otherId) return;

    const opTitle = op.titulo ?? 'Operación';
    const label = this.statusLabel(newStatus);
    const opPath = `/app/operaciones/${op.id}`;

    void this.createInApp(
      otherId,
      'status_changed',
      'Operación actualizada',
      `"${opTitle}" cambió a: ${label}.`,
      opPath,
    ).catch(() => undefined);

    const other = await this.usuarios.findById(otherId).catch(() => null);
    if (!other || !this.isEmailEnabled(other)) return;

    const frontendUrl = this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';
    await this.send(
      other.correo,
      `Operación actualizada — ${label}`,
      this.tmpl(
        `La operación <strong>${opTitle}</strong> ha cambiado a estado: <strong>${label}</strong>.`,
        `${frontendUrl}${opPath}`,
      ),
    );
  }

  private isEmailEnabled(user: { settings?: unknown }): boolean {
    const s = user.settings as Record<string, unknown> | null | undefined;
    if (!s) return true;
    const notifs = s['notifications'] as Record<string, unknown> | undefined;
    return notifs?.['email'] !== false;
  }

  private async send(to: string, subject: string, html: string): Promise<void> {
    if (!this.transporter) return;
    const from = this.config.get<string>('SMTP_FROM') ?? this.config.get<string>('SMTP_USER') ?? 'noreply@openmarket.app';
    try {
      await this.transporter.sendMail({ from, to, subject, html });
      this.logger.log(`Email → ${to}: ${subject}`);
    } catch (err) {
      this.logger.error(`Email failed → ${to}`, (err as Error).message);
    }
  }

  private statusLabel(status: string): string {
    const map: Record<string, string> = {
      confirmed: 'Publicada',
      shipped: 'Enviada / Agotada',
      completed: 'Completada',
      cancelled: 'Cancelada',
    };
    return map[status] ?? status;
  }

  private tmpl(body: string, url: string): string {
    return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><style>
  body { font-family: system-ui, sans-serif; color: #1a1a1a; background: #FAF7F1; margin: 0; padding: 24px; }
  .card { background: #fff; border-radius: 16px; padding: 32px; max-width: 520px; margin: 0 auto; }
  .btn { display: inline-block; margin-top: 24px; padding: 12px 24px; background: #c0392b; color: #fff; border-radius: 10px; text-decoration: none; font-weight: 600; }
  .footer { margin-top: 24px; font-size: 12px; color: #999; text-align: center; }
</style></head>
<body>
  <div class="card">
    <p style="font-size:15px;line-height:1.6">${body}</p>
    <a class="btn" href="${url}">Ver operación →</a>
    <div class="footer">OpenMarket · Marketplace digital</div>
  </div>
</body>
</html>`;
  }
}
