#!/bin/bash
# StockFlow RD — Deploy Test
# Verifica que todo esté listo antes de entregar a clientes

set -e
PASS=0
FAIL=0

green() { echo -e "\033[32m✅ $1\033[0m"; PASS=$((PASS+1)); }
red()   { echo -e "\033[31m❌ $1\033[0m"; FAIL=$((FAIL+1)); }
skip()  { echo -e "\033[33m⏭️  $1\033[0m"; }

echo ""
echo "═══════════════════════════════════════"
echo "  StockFlow RD — Deploy Test"
echo "═══════════════════════════════════════"
echo ""

# 1. Dependencias
echo "── Dependencias ──"
[ -f node_modules/.package-lock.json ] && green "Backend dependencies installed" || skip "Backend dependencies (run npm ci)"
[ -f stockflow-frontend/node_modules/.package-lock.json ] && green "Frontend dependencies installed" || skip "Frontend dependencies (run npm ci)"

# 2. Archivos esenciales
echo ""
echo "── Archivos esenciales ──"
[ -f src/server.js ] && green "server.js exists" || red "server.js missing"
[ -f src/runMigrations.js ] && green "runMigrations.js exists" || red "runMigrations.js missing"
[ -f src/migrations/001_core_schema.sql ] && green "migrations/001_core_schema.sql exists" || red "001 missing"
[ -f src/migrations/002_password_resets.sql ] && green "migrations/002_password_resets.sql exists" || red "002 missing"
[ -f Dockerfile ] && green "Dockerfile exists" || red "Dockerfile missing"
[ -f docker-compose.yml ] && green "docker-compose.yml exists" || red "docker-compose.yml missing"
[ -f stockflow-frontend/Dockerfile ] && green "Frontend Dockerfile exists" || red "Frontend Dockerfile missing"
[ -f stockflow-frontend/nginx.conf ] && green "nginx.conf exists" || red "nginx.conf missing"
[ -f scripts/backup.sh ] && green "backup.sh exists" || red "backup.sh missing"
[ -f scripts/restore.sh ] && green "restore.sh exists" || red "restore.sh missing"
[ -f .env.example ] && green ".env.example exists" || red ".env.example missing"

# 3. Scripts ejecutables
echo ""
echo "── Scripts ejecutables ──"
[ -x scripts/backup.sh ] && green "backup.sh is executable" || red "backup.sh not executable"
[ -x scripts/restore.sh ] && green "restore.sh is executable" || red "restore.sh not executable"

# 4. Migraciones
echo ""
echo "── Migraciones ──"
if node src/runMigrations.js 2>&1 | tail -1 | grep -q "completadas"; then
  green "Migrations run successfully"
else
  red "Migrations failed"
fi

# 5. Frontend build
echo ""
echo "── Frontend build ──"
if (cd stockflow-frontend && npm run build 2>&1 | tail -3 | grep -q "built in"); then
  green "Frontend builds successfully"
else
  red "Frontend build failed"
fi

# 6. Estructura de migraciones
echo ""
echo "── Estructura de migraciones ──"
MIGRATIONS=$(ls src/migrations/*.sql 2>/dev/null | wc -l | tr -d ' ')
[ "$MIGRATIONS" -ge 2 ] && green "$MIGRATIONS migration files found" || red "Expected >=2 migrations, found $MIGRATIONS"

# 7. npm scripts
echo ""
echo "── npm scripts ──"
node -e "const p = require('./package.json'); ['dev','start','migrate'].forEach(s => { if(!p.scripts[s]) process.exit(1) })" \
  && green "npm scripts (dev, start, migrate) defined" || red "Missing npm scripts"

# 8. Docker compose health checks
echo ""
echo "── Docker health checks ──"
grep -q "healthcheck" docker-compose.yml && green "docker-compose has health checks" || red "Missing health checks"

echo ""
echo "═══════════════════════════════════════"
echo "  Resultados: $PASS pasaron, $FAIL fallaron"
echo "═══════════════════════════════════════"
echo ""

if [ "$FAIL" -gt 0 ]; then
  echo "⚠️  Revisa los errores antes de entregar."
  exit 1
else
  echo "🎉 Todo listo para entregar."
fi
