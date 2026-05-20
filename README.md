# OpenMarket — Monorepo

Frontend + Backend de **OpenMarket**, plataforma de marketplace digital (B2B/B2C/C2C) del TFG. Implementa autenticación (JWT + refresh cookie), gestión de empresas con Stripe Connect KYB (onboarding en español), marketplace de operaciones con búsqueda y filtros, carrito de compra, chat en tiempo real (Firestore), pagos split via Stripe Checkout, notificaciones email + in-app, imágenes de productos (Cloudinary), valoraciones y comentarios, controles avanzados de visibilidad por vendedor, y perfil con nombre de empresa para cuentas business.

## Stack

- **Monorepo:** pnpm workspaces
- **Backend:** NestJS 10 + TypeORM (PostgreSQL 16) + Stripe Connect
- **Frontend:** Vite 5 + React 18 + React Router v6 + TypeScript + Tailwind CSS 3
- **Cloud:** Firebase (Firestore chat) + Google Cloud
- **Imágenes:** Cloudinary (unsigned upload, cloud `dehsoatcf`, preset `cloud_name`)
- **Pagos:** Stripe Connect Express (split) + Stripe Checkout
- **Email:** Nodemailer (Gmail SMTP)
- **Fuentes:** Fraunces (display) + Inter (UI)

## Cómo correrlo en local

Requisitos: **Node.js ≥20**, **pnpm ≥9**, **PostgreSQL 16**, **Docker** (opcional).

```bash
# bootstrap workspace
pnpm install

# copiar .env.example a .env en la raíz, completar variables
cp .env.example .env

# levantar Postgres + Stripe CLI (docker compose) o manual
docker compose up -d

# migraciones DB
pnpm db:migrate
pnpm db:seed

# dev: API (:3001) + web (:3000) en paralelo
pnpm dev

# o por separado:
pnpm dev:api
pnpm --filter openmarket-web dev
```

Abre http://localhost:3000

Para recibir webhooks de Stripe en local:

```bash
stripe listen --forward-to localhost:3001/webhook
# copia el whsec_... y ponlo en STRIPE_WEBHOOK_SECRET del .env
```

### Build y producción

```bash
pnpm build        # build all workspaces (api + web)
pnpm --filter openmarket-web preview   # preview build localmente
```

## Variables de entorno clave (.env)

```env
# PostgreSQL
DB_HOST / DB_PORT / DB_USER / DB_PASSWORD / DB_NAME

# JWT
JWT_SECRET / JWT_REFRESH_SECRET

# Stripe Connect
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Firebase (Admin SDK)
FIREBASE_SERVICE_ACCOUNT_PATH=secrets/firebase-service-account.json

# App
FRONTEND_URL=http://localhost:3000

# SMTP — opcional, deshabilita emails si se omite
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=openmarket.tfg@gmail.com
SMTP_PASS=<app-password-16-chars>
SMTP_FROM=OpenMarket <openmarket.tfg@gmail.com>
```

Ver `.env.example` para la lista completa.

## Estructura — Frontend (apps/web/)

```
apps/web/src/
├─ main.tsx                 # bootstrap + BrowserRouter
├─ App.tsx                  # <Routes> + <ProtectedRoute> + <CartProvider>
├─ index.css                # Tailwind + accessibility classes (reduce-motion, high-contrast, large-text)
├─ lib/
│  ├─ api-client.ts         # fetch wrapper (auto-401 refresh, credentials: include)
│  ├─ api-types.ts          # tipos, enums, PRODUCTO_CATS/SERVICIO_CATS, categoriaLabel()
│  ├─ {auth,operaciones,settings}-api.ts  # domain-specific API calls
│  └─ firebase.ts           # Firebase Firestore init
├─ state/
│  ├─ auth.tsx              # useAuth() — login, register, MFA, Google
│  ├─ ops.tsx               # useOperacion(id) — detail + changeStatus
│  └─ cart.tsx              # useCart() — localStorage cart por userId (om.cart.<userId>)
├─ hooks/
│  ├─ useChat.ts            # Firestore messages + send
│  └─ useChats.ts           # list chats por participante
├─ components/
│  ├─ layout/
│  │  ├─ AppLayout.tsx      # sidebar + topbar (con badge carrito) + main
│  │  └─ ProtectedRoute.tsx
│  └─ …
└─ pages/
   ├─ auth/
   │  ├─ LoginLanding.tsx / LoginTipo.tsx / LoginCredenciales.tsx / Verificacion.tsx
   │  ├─ RegistroUsuario.tsx / RegistroEmpresa.tsx
   │  └─ RegistroEmpresaStripe.tsx  # KYB via Stripe Account Link
   └─ app/
      ├─ Home.tsx           # grid de últimas ops públicas + filtros (tipo/categoría/precio)
      ├─ Explorador.tsx     # tabla de ops con búsqueda + filtros + paginación
      ├─ Operaciones.tsx    # mis operaciones: tabla con columna unidades (qty vendida/comprada) + total real
      ├─ OperacionNueva.tsx # crear op: selector tipo→subcategoría, precio con IVA, fotos
      ├─ OperacionEditar.tsx   # editar borrador (pending): mismo form, datos precargados
      ├─ OperacionDetalle.tsx  # detalle + valoraciones + comprar + inventario + toggles visibilidad + total pagado
      ├─ Carrito.tsx        # carrito con checkboxes, qty stepper, pago individual/secuencial
      ├─ Chats.tsx
      ├─ Notificaciones.tsx # lista in-app con iconos, timestamps relativos, marcar leídas
      ├─ Perfil.tsx         # perfil público: nombre responsable + nombre empresa (si empresa)
      └─ Ajustes.tsx        # settings (email/push/privacy/accessibility + change-email/password + nombre empresa)
```

## Estructura — Backend (apps/api/)

```
apps/api/src/
├─ main.ts                 # bootstrap NestJS, setGlobalPrefix('api/v1')
├─ app.module.ts           # root module
├─ auth/                   # JWT, login, register, refresh, change-email, change-password
├─ usuarios/               # Usuario entity + service
├─ empresas/               # Empresa entity + Stripe Connect onboarding
├─ operaciones/            # Operacion entity + CRUD + findPublic
├─ payments/               # Stripe integration
│  ├─ stripe.service.ts    # thin Stripe SDK wrapper (quantity support)
│  ├─ payments.service.ts  # createCheckoutSession, buyOperacion(qty), handleEvent
│  ├─ webhook.controller.ts  # POST /webhook (rawBody)
│  └─ payments.controller.ts # POST /operacion/:id/checkout { quantity? }
├─ notifications/          # Email (nodemailer) + in-app (tabla notificaciones)
│  ├─ notifications.service.ts  # send(), notifyPurchaseCompleted(), notifyStatusChanged()
│  ├─ notificaciones.controller.ts  # GET /notificaciones, PATCH /notificaciones/read-all
│  └─ notifications.module.ts
├─ valoraciones/           # Ratings + comentarios por operación
│  ├─ valoraciones.service.ts   # create(), findByOperacion()
│  └─ valoraciones.module.ts
├─ chat/                   # Firestore chat room creation
├─ settings/               # UserSettings JSONB CRUD
├─ common/
│  ├─ guards/              # JwtAuthGuard
│  ├─ decorators/          # @CurrentUser()
│  └─ filters/
├─ config/
│  └─ env.validation.ts    # Joi schema — añadir vars nuevas aquí
└─ database/
   ├─ migrations/
   ├─ data-source.ts
   └─ seed.ts
```

## Rutas — Auth (pre-login)

| Ruta | Descripción |
|---|---|
| `/login` | Landing: email input |
| `/login/tipo?mode=login\|signup` | Cliente vs Empresa |
| `/login/credenciales` | Email + contraseña; Google SSO |
| `/login/verificacion` | Código 6-dígito OTP |
| `/registro/usuario` | Form cliente |
| `/registro/empresa` | Form empresa (razón social, NIF, sector) |
| `/registro/empresa/stripe` | Stripe Account Link (KYB) |

## Rutas — App (post-login)

| Ruta | Descripción |
|---|---|
| `/app` | Home: grid ops públicas + filtros |
| `/app/explorador` | Tabla de mercado + búsqueda + filtros |
| `/app/operaciones` | Mis operaciones |
| `/app/operaciones/nueva` | Crear operación (con fotos Cloudinary) |
| `/app/operaciones/:id` | Detalle: valoraciones + comprar + inventario + controles vendedor |
| `/app/operaciones/:id/editar` | Editar borrador (solo vendedor + pending) |
| `/app/operaciones/:id?checkout=success\|cancelled` | Banners post-Stripe |
| `/app/carrito` | Carrito de compra |
| `/app/chats` | Chat list + conversación |
| `/app/notificaciones` | Notificaciones in-app |
| `/app/ajustes` | Settings (email, accesibilidad, cambiar contraseña/email) |

## Flujo de estados de una Operación

```
pending (borrador, solo visible al vendedor)
    → confirmed  (publicada, visible en Explorador/Home, comprable)
         → shipped   (sin stock, oculta en Explorador, visible a participantes)
              → completed (entregada, marcada por vendedor/comprador)
    → cancelled  (cancelada, solo visible al creador)
```

- **pending**: el vendedor puede editar, publicar (→ confirmed) o cancelar.
- **confirmed**: cualquier usuario autenticado puede comprar. Stock decrementa por qty. Si `activa=true` y `stock>0` aparece en Explorador/Home.
- **shipped**: stock = 0. Oculta en mercado (excepto si `mostrarSinStock=true`). Comprador puede valorar.
- **completed**: final. El vendedor marca tras entregar. Comprador puede valorar.
- Al cambiar estado vía `PATCH /operaciones/:id/status`, `NotificationsService` envía email a la otra parte (si tiene notificaciones email activadas en Ajustes).
- Editar stock (confirmed/shipped): `PATCH /operaciones/:id` `{ stock }` — actualiza `cantidad` preservando unidades vendidas; stock→0 mueve a `shipped`, stock→>0 vuelve a `confirmed`.

## Categorías de operaciones

Dos grupos de subcategorías. Se almacenan como `varchar(50)` en DB (no enum):

| Productos | Servicios |
|---|---|
| electronica, hogar_jardin, moda_accesorios | consultoria, desarrollo_software, diseno_grafico |
| alimentacion, deportes_ocio, vehiculos, otro_producto | marketing, educacion, salud, logistica, mantenimiento, otro_servicio |

> Si se añaden categorías: actualizar `PRODUCTO_CATS`/`SERVICIO_CATS` en `api-types.ts`, el `@IsIn` del DTO backend, y el CHECK constraint en PostgreSQL.

## Carrito (frontend-only)

- Estado en `localStorage` bajo `om.cart.<userId>`. No hay tabla en DB.
- `CartProvider` en `App.tsx` — `useCart()` en cualquier componente.
- Checkout siempre es por operación individual (una Stripe Session por item).
- El carrito solo elimina un item cuando el usuario pulsa **Actualizar** en el banner `?checkout=success`. Cancelar Stripe → item permanece en carrito.

## Notificaciones (email + in-app)

- Backend: `NotificationsService` (nodemailer + tabla `notificaciones` en PostgreSQL).
- **In-app** (`GET /api/v1/notificaciones`): últimas 50, badge en campana del topbar, página `/app/notificaciones`.
- **Compra completada** → in-app + email al comprador y vendedor. También envía invitación a valorar (⭐) al comprador.
- **Cambio de estado** → in-app + email a la otra parte.
- El toggle **"Email"** en Ajustes → Notificaciones activa/desactiva emails por usuario.
- Notificaciones de mensajes de chat **no implementadas** (requeriría Firebase Cloud Functions).

## Arquitectura — Flujos clave

### Auth
- `POST /api/v1/auth/register` → JWT access + refresh cookie
- `POST /api/v1/auth/login` → access + cookie
- `POST /api/v1/auth/refresh` → nuevo access token (auto en 401)
- `POST /api/v1/auth/change-password` | `PATCH /api/v1/auth/change-email` → con contraseña actual

### Empresas + Stripe Connect
- `POST /api/v1/empresas` → crea Empresa (1 por user, 409 si ya existe)
- `POST /api/v1/payments/connect/onboarding` → Stripe Express Account + Account Link (URL con `?locale=es-ES` forzado)
- Webhook `account.updated` → actualiza `verifiedStatus` (VERIFIED/PENDING/REJECTED)
- `GET /api/v1/settings/profile` → devuelve `empresaNombre` para cuentas empresa

### Operaciones + Marketplace
- `POST /api/v1/operaciones` → crea op (estado `pending`; creator = vendedor)
- `GET /api/v1/operaciones/explorador?q=X` → ops `activa=true`, `(confirmed+stock>0)` o `(shipped+mostrarSinStock=true)`
- `GET /api/v1/operaciones/:id` → visible a cualquier usuario autenticado
- `PATCH /api/v1/operaciones/:id` → editar (pending: todo; confirmed/shipped: solo stock)
- `PATCH /api/v1/operaciones/:id/settings` → `{ activa?, mostrarSinStock? }` (solo vendedor)
- `PATCH /api/v1/operaciones/:id/status` → solo participantes; dispara email notificación
- `GET /api/v1/operaciones/:id/valoraciones` → lista de ratings
- `POST /api/v1/operaciones/:id/valoraciones` → crear rating (solo comprador, 1 por operación)

### Checkout + Pagos
- `POST /api/v1/payments/operacion/:id/checkout` body `{ quantity?: number }`
  - Seller con Stripe Account → split payment
  - Sin Stripe Account → direct checkout a plataforma
- Webhook `checkout.session.completed` → decrementa stock × qty, registra `idComprador`, mueve a `shipped` si `stock === 0`

### Chat (Firestore)
- `useChat(chatId)` → suscribe a `/chats/:chatId/messages/*`
- `useChats(userId)` → lista `/chats/*` por `participants`
- Chat room: backend crea la sala en Firestore; frontend escribe mensajes directamente

## Desarrollo local — Stripe test

```bash
stripe listen --forward-to localhost:3001/webhook
# Test card: 4242 4242 4242 4242 | any future date | any CVC
```

## Próximos pasos

- [ ] Chat room auto-creation en `POST /operaciones` (actualmente es un TODO)
- [ ] Pago de múltiples items del carrito en una sola sesión (requiere backend multi-item)
- [ ] Rate limiting en endpoints sensibles (pagos, login)
- [ ] Tests: auth flow, checkout session, webhook `checkout.session.completed`, transiciones de estado
- [ ] Notificaciones push / mensajes de chat (Firebase Cloud Functions)
- [ ] Panel de administración (gestión de usuarios, operaciones, reportes)
