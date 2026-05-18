# StockFlow RD

Sistema de gestión de inventario y ventas para negocios en República Dominicana.
Cumplimiento fiscal: NCF, ITBIS, reportes DGII.

## Stack

- **Backend**: Node.js + Express + PostgreSQL
- **Frontend**: React + Vite + Recharts
- **Auth**: JWT (roles: admin / employee)

## Requisitos

- Node.js 20+
- PostgreSQL 16+
- Docker (opcional, para deploy)

## Inicio rápido (desarrollo)

```bash
# Backend
cp .env.example .env  # editar credenciales
npm install
npm run dev            # http://localhost:3000

# Frontend (otra terminal)
cd stockflow-frontend
cp .env.development .env
npm install
npm run dev            # http://localhost:5173
```

## Inicio rápido (Docker)

```bash
docker compose up -d
# Frontend: http://localhost
# API: http://localhost:3000
# Health: http://localhost:3000/health
```

### Con HTTPS

```bash
# Colocar certificados en ./certs/ (privkey.pem + fullchain.pem)
export SSL_DIR=./certs
docker compose -f docker-compose.yml -f docker-compose.https.yml up -d
```

## Backup

```bash
./scripts/backup.sh
# Programar con cron: 0 3 * * * /ruta/a/scripts/backup.sh
```

## API endpoints

### Auth
| Método | Ruta | Acceso |
|--------|------|--------|
| POST | `/api/auth/register` | Público |
| POST | `/api/auth/login` | Público (rate limit: 10/15min) |

### Productos
| Método | Ruta | Acceso |
|--------|------|--------|
| GET | `/api/products?page=1&limit=50` | Autenticado |
| GET | `/api/products/low-stock` | Autenticado |
| GET | `/api/products/:id` | Autenticado |
| POST | `/api/products` | Admin |
| PUT | `/api/products/:id` | Admin |
| DELETE | `/api/products/:id` | Admin |

### Ventas
| Método | Ruta | Acceso |
|--------|------|--------|
| GET | `/api/sales?page=1&limit=50` | Autenticado |
| GET | `/api/sales/:id` | Autenticado |
| POST | `/api/sales` | Autenticado |
| PUT | `/api/sales/:id` | Autenticado |
| PUT | `/api/sales/:id/cancel` | Autenticado |
| DELETE | `/api/sales/:id` | Admin |

### Compras, Proveedores, Clientes, Categorías
Todas siguen el mismo patrón CRUD con paginación opcional (`?page=1&limit=50`).

### Reportes
| Ruta | Descripción |
|------|-------------|
| `/api/reports/dashboard` | KPIs generales |
| `/api/reports/dgii?month=&year=` | Declaración ITBIS mensual |
| `/api/reports/profit?from=&to=` | Ganancias por período |

### Health
| Ruta | Descripción |
|------|-------------|
| `/health` | Estado del servidor y BD |

## Roles

- **admin**: CRUD completo, configuración, usuarios, reportes DGII
- **employee**: Ventas, consultas, dashboard

## Funcionalidades

- Control de inventario (kardex / movimientos)
- Facturación fiscal dominicana (NCF + ITBIS)
- Reporte DGII mensual exportable a PDF
- Dashboard con gráficas (ingresos, productos más vendidos)
- Módulo de ganancias con margen por producto
- Roles y permisos (admin / employee)
- Búsqueda en listados
- Paginación opcional en API
- Docker + docker-compose listo para producción
- Health check endpoint
- Logs estructurados (winston)
- Rate limiting en auth
- Helmet (seguridad HTTP)
- CORS configurable
- Script de backup automático
- CI/CD (GitHub Actions)
- HTTPS vía nginx + certs

## Estructura

```
stockflow-rd/
├── src/
│   ├── config/        # DB, logger, paginación
│   ├── controllers/   # Lógica de negocio
│   ├── middlewares/    # Auth, roles, uploads
│   ├── routes/        # Definición de rutas
│   ├── services/      # NCF, utilidades
│   └── migration.sql  # Esquema BD
├── scripts/           # Backup
├── docker-compose.yml
├── Dockerfile
├── ecosystem.config.js
└── stockflow-frontend/
    ├── src/
    │   ├── pages/     # 12 páginas
    │   ├── components/ # Navbar, etc.
    │   ├── hooks/     # usePDF
    │   └── services/  # API client
    ├── Dockerfile
    └── nginx.conf
```

## Autor

Elvis Carvajal — República Dominicana
