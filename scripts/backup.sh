#!/bin/bash
# StockFlow RD — Backup automático de base de datos
# Uso: ./scripts/backup.sh [output_dir]

set -e

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
OUT_DIR="${1:-./backups}"
mkdir -p "$OUT_DIR"

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-elvis}"
DB_NAME="${DB_NAME:-stockflow}"
DB_PASSWORD="${DB_PASSWORD:-}"

export PGPASSWORD="$DB_PASSWORD"
FILENAME="$OUT_DIR/stockflow_${TIMESTAMP}.sql"

echo "Backup de $DB_NAME -> $FILENAME"

pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" \
  --no-owner --no-acl --format=custom \
  -f "$FILENAME" "$DB_NAME"

echo "Backup completado: $(du -h "$FILENAME" | cut -f1)"

# Limpiar backups viejos (>30 días)
find "$OUT_DIR" -name "stockflow_*.sql" -mtime +30 -delete
echo "Backups antiguos eliminados"
echo "Total backups: $(find "$OUT_DIR" -name "stockflow_*.sql" | wc -l | tr -d ' ')"
