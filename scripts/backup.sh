#!/bin/sh
# Prod server'da cron orqali ishga tushiriladi (bu sessiyada ishga
# tushirilmagan/sinovdan o'tkazilmagan — real server/kredensial yo'q).
# PLAN.md "Kuzatuv va ishonchlilik": kunlik pg_dump, MinIO fayllari sync,
# N kundan eski nusxalar rotatsiya bilan o'chiriladi.
#
# Cron namunasi (har kuni 03:00):
#   0 3 * * * BACKUP_DIR=/var/backups/murcha /repo/scripts/backup.sh >> /var/log/murcha-backup.log 2>&1
#
# Talab qilinadigan muhit o'zgaruvchilari (`.env`dagi bilan bir xil):
#   POSTGRES_USER, POSTGRES_DB, MINIO_ROOT_USER, MINIO_ROOT_PASSWORD, MINIO_ENDPOINT
# Ixtiyoriy: BACKUP_DIR (standart /var/backups/murcha), BACKUP_KEEP_DAYS (standart 14)

set -eu

BACKUP_DIR="${BACKUP_DIR:-/var/backups/murcha}"
BACKUP_KEEP_DAYS="${BACKUP_KEEP_DAYS:-14}"
TIMESTAMP="$(date +%Y-%m-%d_%H%M%S)"
DB_DIR="$BACKUP_DIR/db"
MINIO_DIR="$BACKUP_DIR/minio"

mkdir -p "$DB_DIR" "$MINIO_DIR"

echo "[$TIMESTAMP] PostgreSQL dump boshlandi..."
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U "${POSTGRES_USER:-murcha}" "${POSTGRES_DB:-murcha}" \
  | gzip > "$DB_DIR/murcha_$TIMESTAMP.sql.gz"
echo "[$TIMESTAMP] PostgreSQL dump tugadi: $DB_DIR/murcha_$TIMESTAMP.sql.gz"

echo "[$TIMESTAMP] MinIO sync boshlandi..."
docker compose -f docker-compose.prod.yml exec -T minio \
  mc alias set local "http://localhost:9000" "${MINIO_ROOT_USER:-murcha}" "${MINIO_ROOT_PASSWORD:-murcha123}"
docker compose -f docker-compose.prod.yml exec -T minio \
  mc mirror --overwrite local/murcha "/tmp/minio-backup-$TIMESTAMP"
docker compose -f docker-compose.prod.yml cp \
  "minio:/tmp/minio-backup-$TIMESTAMP" "$MINIO_DIR/$TIMESTAMP"
echo "[$TIMESTAMP] MinIO sync tugadi: $MINIO_DIR/$TIMESTAMP"

echo "[$TIMESTAMP] $BACKUP_KEEP_DAYS kundan eski nusxalar o'chirilmoqda..."
find "$DB_DIR" -name "murcha_*.sql.gz" -mtime "+$BACKUP_KEEP_DAYS" -delete
find "$MINIO_DIR" -maxdepth 1 -mindepth 1 -type d -mtime "+$BACKUP_KEEP_DAYS" -exec rm -rf {} +

echo "[$TIMESTAMP] Backup tugadi."

# Tiklash (restore) sinovi — qo'lda, alohida serverda:
#   gunzip -c murcha_<timestamp>.sql.gz | docker compose -f docker-compose.prod.yml exec -T postgres \
#     psql -U murcha -d murcha
#   docker compose -f docker-compose.prod.yml exec -T minio \
#     mc mirror /path/to/minio-backup-<timestamp> local/murcha
