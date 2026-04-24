📦 StockFlow RD API

Backend de gestión de inventario y ventas desarrollado con Node.js, Express y PostgreSQL.
Incluye autenticación con JWT, control de roles (admin / employee) y lógica real de negocio.

🚀 Características
CRUD completo de productos
Registro de ventas con descuento automático de stock
Historial de ventas
Reporte de dashboard (KPIs)
Autenticación con JWT
Protección de rutas
Sistema de roles:
Admin: gestiona productos
Employee: registra ventas y consulta datos
🛠️ Tecnologías
Node.js
Express
PostgreSQL
JWT (jsonwebtoken)
bcrypt
dotenv
⚙️ Instalación
Clonar repositorio:
git clone https://github.com/TU-USUARIO/stockflow-rd.git
cd stockflow-rd
Instalar dependencias:
npm install
Crear archivo .env en la raíz:
DB_HOST=localhost
DB_USER=elvis
DB_PASSWORD=
DB_NAME=stockflow
DB_PORT=5432

JWT_SECRET=stockflow_super_secret_key_2026
Ejecutar servidor:
npm run dev
🔐 Autenticación
Registro
POST /api/auth/register
Login
POST /api/auth/login

Devuelve un token JWT que debe enviarse en headers:

Authorization: Bearer TOKEN
📦 Productos
Método Endpoint
GET /api/products
GET /api/products/:id
GET /api/products/low-stock
POST /api/products
PUT /api/products/:id
DELETE /api/products/:id

🔒 Protegido por JWT
👤 Solo admin puede crear, editar y eliminar

💰 Ventas
Método Endpoint
POST /api/sales
GET /api/sales
GET /api/sales/:id
Registra ventas con múltiples productos
Calcula total automáticamente
Descuenta stock en tiempo real

🔒 Requiere autenticación

📊 Reportes
GET /api/reports/dashboard

Incluye:

Total de productos
Total de ventas
Ingresos
Productos con bajo stock
Ventas recientes
🔐 Roles
Rol Permisos
admin CRUD productos + ventas
employee ver productos + registrar ventas
🧠 Lógica destacada
Transacciones SQL (BEGIN / COMMIT / ROLLBACK)
Validación de stock antes de venta
Encriptación de contraseñas
Middleware de autenticación y autorización
👨‍💻 Autor

Elvis Carvajal
Software Engineering Student
República Dominicana

🔥 Nota final

Este proyecto simula un sistema real de inventario con buenas prácticas de backend, seguridad y manejo de datos.
# stockflow-rd
