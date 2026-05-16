export enum UserRole {
  CLIENTE = 'cliente',
  EMPRESA = 'empresa',
  ADMIN = 'admin',
}

export enum OperacionStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  SHIPPED = 'shipped',
  COMPLETED = 'completed',
  DISPUTED = 'disputed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

export enum PaymentStatus {
  OPEN = 'open',
  PENDING = 'pending',
  AUTHORIZED = 'authorized',
  PAID = 'paid',
  EXPIRED = 'expired',
  CANCELED = 'canceled',
  FAILED = 'failed',
}

export enum VerifiedStatus {
  UNSTARTED = 'unstarted',
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
}

export enum ProductoStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DELETED = 'deleted',
}

export enum MfaType {
  TOTP = 'totp',
  SMS = 'sms',
}
