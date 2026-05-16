import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Inicializa Firebase Admin SDK una sola vez.
 * Firestore se usa SOLO para chat en tiempo real.
 * PostgreSQL sigue siendo la fuente de verdad para usuarios, pedidos, etc.
 */
@Injectable()
export class FirebaseAdminService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseAdminService.name);
  private _firestore!: admin.firestore.Firestore;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    if (admin.apps.length > 0) {
      this._firestore = admin.app().firestore();
      return;
    }

    const serviceAccountPath = path.resolve(
      process.cwd(),
      this.config.get<string>('FIREBASE_SERVICE_ACCOUNT_PATH', 'secrets/firebase-service-account.json'),
    );

    if (!fs.existsSync(serviceAccountPath)) {
      throw new Error(`Firebase service account not found at: ${serviceAccountPath}`);
    }

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const serviceAccount = require(serviceAccountPath) as admin.ServiceAccount;

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    this._firestore = admin.firestore();
    this.logger.log('Firebase Admin SDK initialized');
  }

  get firestore(): admin.firestore.Firestore {
    return this._firestore;
  }

  /**
   * Emite un Firebase Custom Token para un usuario autenticado en la app.
   * El uid debe ser el user.id de PostgreSQL (UUID string) para alinear con
   * los `participants` almacenados en Firestore.
   * @param uid Identificador estable — PostgreSQL user.id
   * @param claims Claims opcionales (no incluir datos sensibles)
   */
  async createCustomToken(uid: string, claims?: Record<string, unknown>): Promise<string> {
    return admin.auth().createCustomToken(uid, claims);
  }

  /** Verifica y decodifica un Firebase ID token (para auth social en el futuro). */
  async verifyIdToken(idToken: string): Promise<admin.auth.DecodedIdToken> {
    return admin.auth().verifyIdToken(idToken);
  }
}
