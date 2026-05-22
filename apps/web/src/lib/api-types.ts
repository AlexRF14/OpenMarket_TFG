// Tipos compartidos con el backend.
// Espejo manual de los tipos relevantes — eventualmente usar @marketplace/shared-types
// pero por simplicidad de Vite, replicamos lo mínimo aquí.

export type UserRole = 'cliente' | 'empresa' | 'admin';

export type OperacionStatus =
  | 'pending'
  | 'confirmed'
  | 'shipped'
  | 'completed'
  | 'disputed'
  | 'cancelled'
  | 'refunded';

export type ProductoStatus = 'draft' | 'active' | 'inactive' | 'deleted';

export type OperationType = 'publica' | 'negociada';
// Legacy values still possible on existing DB rows
export type AnyOperationType = OperationType | 'public_b2c' | 'public_b2b' | 'negotiated';

export interface AuthResponse {
  accessToken: string;
  userId: string;
  rol: UserRole;
}

export interface MfaRequiredResponse {
  mfaRequired: true;
  tempToken: string;
}

export type LoginResponse = AuthResponse | MfaRequiredResponse;

export interface ProfileResponse {
  id: string;
  nombre: string;
  apellidos: string;
  correo: string;
  rol: UserRole;
  empresaNombre?: string | null;
}

export interface UserSettings {
  notifications: {
    email: boolean;
    push: boolean;
    chat_messages: boolean;
    operations: boolean;
    marketing: boolean;
  };
  privacy: {
    public_profile: boolean;
    allow_messages: boolean;
    show_valoraciones: boolean;
  };
  accessibility: {
    reduce_motion: boolean;
    high_contrast: boolean;
    large_text: boolean;
  };
}

export type ProductoCategoria =
  | 'electronica'
  | 'hogar_jardin'
  | 'moda_accesorios'
  | 'alimentacion'
  | 'deportes_ocio'
  | 'vehiculos'
  | 'otro_producto';

export type ServicioCategoria =
  | 'consultoria'
  | 'desarrollo_software'
  | 'diseno_grafico'
  | 'marketing'
  | 'educacion'
  | 'salud'
  | 'logistica'
  | 'mantenimiento'
  | 'otro_servicio';

// Legacy values kept for backward compat with existing DB rows
export type Categoria = ProductoCategoria | ServicioCategoria | 'producto' | 'servicio';

export const PRODUCTO_CATS: Array<{ value: ProductoCategoria; label: string }> = [
  { value: 'electronica', label: 'Electrónica' },
  { value: 'hogar_jardin', label: 'Hogar y jardín' },
  { value: 'moda_accesorios', label: 'Moda y accesorios' },
  { value: 'alimentacion', label: 'Alimentación' },
  { value: 'deportes_ocio', label: 'Deportes y ocio' },
  { value: 'vehiculos', label: 'Vehículos' },
  { value: 'otro_producto', label: 'Otro producto' },
];

export const SERVICIO_CATS: Array<{ value: ServicioCategoria; label: string }> = [
  { value: 'consultoria', label: 'Consultoría' },
  { value: 'desarrollo_software', label: 'Desarrollo software' },
  { value: 'diseno_grafico', label: 'Diseño gráfico' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'educacion', label: 'Educación' },
  { value: 'salud', label: 'Salud y bienestar' },
  { value: 'logistica', label: 'Logística' },
  { value: 'mantenimiento', label: 'Mantenimiento' },
  { value: 'otro_servicio', label: 'Otro servicio' },
];

export const ALL_PRODUCTO_VALUES: string[] = [...PRODUCTO_CATS.map((c) => c.value), 'producto'];
export const ALL_SERVICIO_VALUES: string[] = [...SERVICIO_CATS.map((c) => c.value), 'servicio'];

export function categoriaLabel(c: string | null): string {
  if (!c) return '—';
  const p = PRODUCTO_CATS.find((x) => x.value === c);
  if (p) return p.label;
  const s = SERVICIO_CATS.find((x) => x.value === c);
  if (s) return s.label;
  if (c === 'producto') return 'Producto';
  if (c === 'servicio') return 'Servicio';
  return c;
}

export function categoriaTipo(c: string | null): 'producto' | 'servicio' | null {
  if (!c) return null;
  if (ALL_PRODUCTO_VALUES.includes(c)) return 'producto';
  if (ALL_SERVICIO_VALUES.includes(c)) return 'servicio';
  return null;
}

export interface DeliveryInfo {
  fullName: string;
  email: string;
  address: string;
  postalCode: string;
  city: string;
  phone: string;
  deliveryDate: string;
  notes?: string;
}

export interface OperacionDto {
  id: string;
  idComprador: string | null;
  idVendedor: string;
  titulo: string | null;
  categoria: Categoria | null;
  cantidad: number;
  stock: number;
  sellerCompanyId: string | null;
  buyerCompanyId: string | null;
  operationType: AnyOperationType;
  status: OperacionStatus;
  totalAmount: string;
  amountNet: string;
  taxAmount: string;
  platformFee: string;
  currency: string;
  stripeCheckoutSessionId: string | null;
  stripePaymentStatus: string | null;
  stripePaymentIntentId: string | null;
  chatRoomId: string | null;
  notes: string | null;
  images: string[] | null;
  activa: boolean;
  mostrarSinStock: boolean;
  deliveryInfo: DeliveryInfo | null;
  purchasedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ValoracionDto {
  id: string;
  operacionId: string;
  autorId: string;
  autorNombre: string;
  puntuacion: number;
  comentario: string | null;
  createdAt: string;
}

export interface UpdateOperacionDto {
  titulo?: string;
  categoria?: Categoria;
  cantidad?: number;
  stock?: number;
  operationType?: OperationType;
  totalAmount?: string;
  amountNet?: string;
  taxAmount?: string;
  platformFee?: string;
  notes?: string | null;
  images?: string[];
}

export interface CreateOperacionDto {
  titulo: string;
  categoria: Categoria;
  cantidad?: number;
  sellerCompanyId?: string | null;
  buyerCompanyId?: string | null;
  operationType: OperationType; // only 'publica' | 'negociada'
  totalAmount: string;
  amountNet: string;
  taxAmount: string;
  platformFee: string;
  notes?: string | null;
  images?: string[];
}

export type CompraStatus = 'pendiente_pago' | 'activo' | 'reembolsada';

export interface CompraDto {
  id: string;
  operacionId: string;
  compradorId: string;
  quantity: number;
  totalAmount: string;
  totalPagado: string;
  currency: string;
  titulo: string | null;
  categoria: Categoria | null;
  images: string[] | null;
  idVendedor: string;
  operacionStatus: OperacionStatus;
  deliveryInfo: DeliveryInfo | null;
  purchasedAt: string | null;
  stripePaymentIntentId: string | null;
  receivedAt: string | null;
  status: CompraStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ApiError {
  statusCode: number;
  message: string | string[];
  error?: string;
}
