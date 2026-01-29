#!/bin/sh
# ChoreQuest Restore Script
# This script restores data from a backup file

set -e

BACKUP_DIR="/backups"
DATA_DIR="/data"

if [ -z "$1" ]; then
    echo "Usage: $0 <backup_filename>"
    echo ""
    echo "Available backups:"
    ls -lh "${BACKUP_DIR}"/chorequest_backup_*.tar.gz 2>/dev/null || echo "No backups found"
    exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "${BACKUP_DIR}/${BACKUP_FILE}" ]; then
    echo "ERROR: Backup file ${BACKUP_DIR}/${BACKUP_FILE} not found!"
    exit 1
fi

echo "[$(date)] Starting restore process from: ${BACKUP_FILE}"
echo "[$(date)] WARNING: This will overwrite existing data!"
read -p "Continue? (yes/no): " -r
if [ "$REPLY" != "yes" ]; then
    echo "Restore cancelled"
    exit 0
fi

if [ ! -d "${DATA_DIR}" ]; then
    echo "[$(date)] Creating data directory ${DATA_DIR}"
    mkdir -p "${DATA_DIR}"
fi

echo "[$(date)] Creating backup of current data..."
CURRENT_BACKUP="chorequest_pre_restore_$(date +%Y%m%d_%H%M%S).tar.gz"
cd "${DATA_DIR}" && tar -czf "${BACKUP_DIR}/${CURRENT_BACKUP}" . 2>/dev/null || true

echo "[$(date)] Clearing data directory..."
rm -rf "${DATA_DIR}"/*

echo "[$(date)] Extracting backup..."
cd "${DATA_DIR}" && tar -xzf "${BACKUP_DIR}/${BACKUP_FILE}"

if [ $? -eq 0 ]; then
    echo "[$(date)] Restore completed successfully!"
    echo "[$(date)] Previous data backed up to: ${CURRENT_BACKUP}"
else
    echo "[$(date)] ERROR: Restore failed!"
    echo "[$(date)] Attempting to restore previous data..."
    cd "${DATA_DIR}" && tar -xzf "${BACKUP_DIR}/${CURRENT_BACKUP}"
    exit 1
fi

exit 0
