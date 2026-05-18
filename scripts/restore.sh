#!/bin/bash
# StockFlow RD — Restaurar base de datos desde backup
# Uso: ./scripts/restore.sh <archivo_backup> [opciones]
# Opciones:
#   --drop    Eliminar BD antes de restaurar (requiere DB_ADMIN)
#   --list    Solo listar contenido del backup

set -e

if [ "$1" = "--list" ] || [ "$1" = "-l" ]; then
  echo "Contenido del backup: $2"
  pg_restore --list "$2"
  exit 0
fi

BACKUP_FILE="${1:-}"
DROP="${2:-}"

if [ -z "$BACKUP_FILE" ] || [ ! -f "$BACKUP_FILE" ]; then
  echo "❌ Uso: $0 <archivo_backup> [--drop]"
  echo "   $0 --list <archivo_backup>"
  exit 1
fi

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-elvis}"
DB_NAME="${DB_NAME:-stockflow}"
DB_PASSWORD="${DB_PASSWORD:-}"
DB_ADMIN="${DB_ADMIN:-postgres}"

export PGPASSWORD="$DB_PASSWORD"

echo "=========================================="
echo " Restaurar base de datos: $DB_NAME"
echo " Desde: $BACKUP_FILE"
echo "=========================================="
echo "Host: $DB_HOST:$DB_PORT"
echo "Usuario: $DB_USER"
echo ""

if [ "$DROP" = "--drop" ]; then
  echo "⚠️  ATENCIÓN: Se eliminará la base de datos $DB_NAME"
  echo "   y se recreará desde el backup."
  echo "   Escribe 'CONFIRMAR' para continuar:"
  read -r CONFIRM
  if [ "$CONFIRM" != "CONFIRMAR" ]; then
    echo "Cancelado."
    exit 1
  fi

  export PGPASSWORD="${DB_ADMIN_PASSWORD:-$DB_PASSWORD}"

  echo "Eliminando conexiones existentes..."
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_ADMIN" -d postgres -c "
    SELECT pg_terminate_backend(pg_stat_activity.pid)
    FROM pg_stat_activity
    WHERE pg_stat_activity.datname = '$DB_NAME'
      AND pid <> pg_backend_pid();
  " 2>/dev/null || true

  echo "Eliminando base de datos..."
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_ADMIN" -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;"

  echo "Creando base de datos..."
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_ADMIN" -d postgres -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"

  export PGPASSWORD="$DB_PASSWORD"
fi

echo "Restaurando desde backup..."
pg_restore -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" \
  --dbname="$DB_NAME" \
  --clean --if-exists \
  --no-owner --no-acl \
  --verbose \
  "$BACKUP_FILE"

echo ""
echo "✅ Restauración completada: $(date)"
