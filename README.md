# OpenMarket — Monorepo

Frontend + Backend de **OpenMarket**, plataforma de operaciones (B2B/B2C) del TFG. Implementa autenticación (JWT + refresh cookie), gestión de empresas con Stripe Connect KYB, marketplace de operaciones (Operaciones) con búsqueda y filtros, chat en tiempo real (Firestore), y pagos split via Stripe Checkout.

## Stack

- **Monorepo:** pnpm workspaces
- **Backend:** NestJS 10 + TypeORM (PostgreSQL 16) + Stripe Connect
- **Frontend:** Vite 5 + React 18 + React Router v6 + TypeScript + Tailwind CSS 3
- **Cloud:** Firebase (Firestore chat) + Google Cloud
- **Pagos:** Stripe Connect Express (split) + Stripe Checkout
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

### Build y producción

```bash
pnpm build        # build all workspaces (api + web)
pnpm --filter openmarket-web preview   # preview build localmente
```

## Estructura — Frontend (apps/web/)

```
apps/web/
├─ vite.config.ts
├─ index.html
├─ tsconfig.json
├─ tailwind.config.js
├─ package.json
└─ src/
   ├─ main.tsx                 # bootstrap + BrowserRouter
   ├─ App.tsx                  # <Routes> + <ProtectedRoute> guard
   ├─ index.css                # Tailwind + estilos base
   ├─ lib/
   │  ├─ api-client.ts         # fetch wrapper (auto-401 refresh, credentials: include)
   │  ├─ api-types.ts          # enums + DTOs (OperationType, OperacionDto, …)
   │  ├─ {auth,operaciones,settings}-api.ts  # domain-specific API calls
   │  └─ firebase.ts           # Firebase Firestore init
   ├─ state/
   │  ├─ auth.tsx              # useAuth() context (login, register, MFA, Google)
   │  └─ ops.tsx               # useOperacion(id) hook para detail + changeStatus
   ├─ hooks/
   │  ├─ useChat(chatId)       # Firestore messages + send
   │  └─ useChats(userId)      # list chats por participante
   ├─ components/
   │  ├─ ui/
   │  ├─ layout/
   │  │  ├─ AppLayout.tsx      # sidebar + topbar + main
   │  │  └─ ProtectedRoute.tsx # redirect a /login si no auth
   │  ├─ forms/
   │  └─ chat/
   └─ pages/
      ├─ auth/
      │  ├─ LoginLanding.tsx
      │  ├─ LoginTipo.tsx
      │  ├─ LoginCredenciales.tsx
      │  ├─ Verificacion.tsx
      │  ├─ RegistroUsuario.tsx
      │  ├─ RegistroEmpresa.tsx
      │  └─ RegistroEmpresaStripe.tsx  # KYB via Stripe Account Link
      └─ app/
         ├─ Home.tsx           # grid de operaciones públicas + latest
         ├─ Explorador.tsx     # search + filter (status, categoria)
         ├─ Operaciones.tsx    # list mis operaciones (comprando/vendiendo)
         ├─ OperacionNueva.tsx # form crear operación
         ├─ OperacionDetalle.tsx  # view + chat + buy/confirm/ship
         ├─ Chats.tsx
         ├─ Ajustes.tsx
         └─ …
```

## Estructura — Backend (apps/api/)

```
apps/api/
├─ src/
│  ├─ main.ts                 # bootstrap NestJS, setGlobalPrefix('api/v1')
│  ├─ app.module.ts           # root module
│  ├─ auth/                   # JWT, login, register, refresh
│  ├─ users/                  # User entity + service
│  ├─ empresas/               # Empresa entity + Stripe Connect onboarding
│  ├─ operaciones/            # Operacion entity + CRUD + findPublic (search)
│  ├─ payments/               # Stripe integration
│  │  ├─ stripe.service.ts    # thin Stripe SDK wrapper
│  │  ├─ payments.service.ts  # createCheckoutSession, buyOperacion, handleEvent
│  │  ├─ webhook.controller.ts  # POST /webhook
│  │  └─ payments.controller.ts # POST /operacion/:id/checkout
│  ├─ chat/                   # Firestore chat room creation
│  ├─ common/
│  │  ├─ guards/              # JwtAuthGuard
│  │  ├─ decorators/          # @CurrentUser()
│  │  └─ filters/             # exception handling
│  ├─ config/
│  │  └─ env.validation.ts    # Joi schema (check new vars here)
│  └─ database/
│     ├─ migrations/
│     ├─ data-source.ts
│     └─ seed.ts
└─ package.json
```

## Rutas — Auth (pre-login)

| Ruta | Descripción |
|---|---|
| `/login` | Landing: email input → modo o crear |
| `/login/tipo?mode=login\|signup` | Cliente vs Empresa |
| `/login/credenciales` | Email + contraseña; Google SSO |
| `/login/verificacion` | Código 6-dígito OTP |
| `/registro/usuario` | Form cliente (username, birthdate, password) |
| `/registro/empresa` | Form empresa (razón social, NIF, sector) |
| `/registro/empresa/stripe` | Stripe Account Link (KYB); redirige a `completado` tras Stripe |
| `/registro/completado` | Confirmación |

## Rutas — App (post-login)

Layout: sidebar colapsable (izq), topbar con search (arriba), main content.

| Ruta | Descripción |
|---|---|
| `/app` | Home: grid de últimas operaciones públicas |
| `/app/explorador?q=X&status=Y` | Búsqueda + filtros (status, categoria) |
| `/app/operaciones?side=comprando\|vendiendo` | Mis operaciones (comprando/vendiendo) |
| `/app/operaciones/nueva` | Crear operación: tipo (publica/negociada), titulo, categoria, cantidad, precio, IVA |
| `/app/operaciones/:id` | Detail: info, chat, comprar (si público), confirmar/marcar entregada (si participante) |
| `/app/operaciones/:id?checkout=success\|cancelled` | Banners post-Stripe |
| `/app/chats` | Chat list (participantes) + conversación split |
| `/app/ajustes` | Perfil, notificaciones, privacidad, zona crítica (RGPD) |

**Operaciones:** tipo `publica` (visible a todos) vs `negociada` (link compartible); campos `titulo`, `categoria` (producto/servicio), `cantidad`, `stock`; creador es vendedor; cualquier usuario autenticado puede ver detalles.

## Arquitectura — Flujos clave

### Auth
- `POST /api/v1/auth/register` (email, username, password, rol) → JWT access + refresh cookie
- `POST /api/v1/auth/login` → access + cookie
- `POST /api/v1/auth/refresh` → new access token (auto-called on 401)
- Google SSO: Firebase `signInWithPopup` → verifify token → `/api/v1/auth/google`

### Empresas + Stripe Connect
- `POST /api/v1/empresas` (razón social, NIF, sector) → crea Empresa (1 por user)
- `POST /api/v1/payments/connect/onboarding` → crea Stripe Express Account + Account Link
- Redirect a Stripe → user completa KYB → Stripe redirige a `/registro/completado`
- Webhook `account.updated` → actualiza `empresa.verifiedStatus` (VERIFIED/PENDING/REJECTED)

### Operaciones + Marketplace
- `POST /api/v1/operaciones` (titulo, categoria, operationType, cantidad, …) → crea op; creator=vendedor
- `GET /api/v1/operaciones/mias?side=comprando|vendiendo` → mis ops
- `GET /api/v1/operaciones/explorador?q=X` → public ops (búsqueda en titulo + notes)
- `GET /api/v1/operaciones/:id` → detail (ANY auth user, no 403)
- `PATCH /api/v1/operaciones/:id/status` → confirmar/cancelar/marcar completada (solo participantes)

### Checkout + Pagos
- `POST /api/v1/payments/operacion/:id/checkout` (currentUser) → crea Stripe Checkout Session
  - Si seller tiene Stripe Account → split payment (transfer_data + application_fee_amount)
  - Si no → direct checkout a plataforma
- Stripe Checkout → pago → redirige a `/app/operaciones/:id?checkout=success|cancelled`
- Webhook `checkout.session.completed` → decrementa stock, confirma operación, registra `idComprador`

### Chat (Firestore)
- `useChat(chatId)` → suscribe a `/chats/:chatId/messages/*`, autenticado via Firebase rules
- `useChats(userId)` → list `/chats/*` por `participants: [userId]`
- Chat room auto-creado por backend al crear operación (TODO)

## Desarrollo local — paso a paso

1. **Variables de entorno** (.env en raíz): Stripe keys, DB credentials, Firebase config, JWT secret
2. **DB:** `docker compose up -d` (o instala Postgres 16 manual)
3. **Migraciones:** `pnpm db:migrate` + `pnpm db:seed`
4. **Dev servers:** `pnpm dev` (abre http://localhost:3000)
5. **Webhooks:** `stripe listen --forward-to localhost:3001/webhook` (en otra terminal)
6. **Test:** Stripe test card `4242 4242 4242 4242` + any future exp/CVC

## Próximos pasos sugeridos

- [ ] Chat room auto-creation en `POST /operaciones`
- [ ] Email notifications (operación confirmada, envío, etc.)
- [ ] Reseñas / ratings (post-operación)
- [ ] Reportes / bloqueos (chat + operaciones)
- [ ] Rate limiting en endpoints sensibles (pagos, login)
- [ ] Swagger UI en `/api/docs` → documentar endpoints nuevos
- [ ] Tests: auth flow, checkout session, webhook `checkout.session.completed`, operación status transitions
