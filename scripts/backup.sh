#!/bin/sh
# ChoreQuest Backup Script
# This script creates timestamped backups of the application data

set -e

BACKUP_DIR="/backups"
DATA_DIR="/data"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="chorequest_backup_${TIMESTAMP}.tar.gz"
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-7}

echo "[$(date)] Starting backup process..."

if [ ! -d "${DATA_DIR}" ]; then
    echo "[$(date)] ERROR: Data directory ${DATA_DIR} does not exist!"
    exit 1
fi

if [ ! -d "${BACKUP_DIR}" ]; then
    echo "[$(date)] Creating backup directory ${BACKUP_DIR}"
    mkdir -p "${BACKUP_DIR}"
fi

cd "${DATA_DIR}" || exit 1

echo "[$(date)] Creating backup: ${BACKUP_FILE}"
tar -czf "${BACKUP_DIR}/${BACKUP_FILE}" . 2>/dev/null || true

if [ $? -eq 0 ]; then
    BACKUP_SIZE=$(du -h "${BACKUP_DIR}/${BACKUP_FILE}" | cut -f1)
    echo "[$(date)] Backup completed successfully: ${BACKUP_FILE} (${BACKUP_SIZE})"
else
    echo "[$(date)] WARNING: Backup completed with warnings"
fi

echo "[$(date)] Cleaning up old backups (keeping last ${RETENTION_DAYS} days)..."
find "${BACKUP_DIR}" -name "chorequest_backup_*.tar.gz" -type f -mtime +${RETENTION_DAYS} -exec rm -f {} \;

BACKUP_COUNT=$(find "${BACKUP_DIR}" -name "chorequest_backup_*.tar.gz" -type f | wc -l)
echo "[$(date)] Backup process completed. Total backups: ${BACKUP_COUNT}"

exit 0
