#!/bin/bash
# ChoreQuest Monitoring Script
# Monitors container health and sends alerts

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

LOG_FILE="/var/log/chorequest-monitor.log"
ALERT_EMAIL="${ALERT_EMAIL:-admin@example.com}"
CONTAINER_NAME="chorequest-app"
HEALTH_ENDPOINT="http://localhost:${CHOREQUEST_PORT:-8080}/health"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

send_alert() {
    local subject="$1"
    local message="$2"
    
    log "ALERT: $subject"
    
    if command -v mail &> /dev/null; then
        echo "$message" | mail -s "ChoreQuest Alert: $subject" "$ALERT_EMAIL"
    else
        log "Email not configured. Install 'mailutils' to enable alerts."
    fi
}

check_container_running() {
    if ! docker ps | grep -q "$CONTAINER_NAME"; then
        log "ERROR: Container is not running"
        send_alert "Container Down" "ChoreQuest container is not running. Attempting restart..."
        
        docker compose -f docker-compose.prod.yml up -d
        sleep 10
        
        if docker ps | grep -q "$CONTAINER_NAME"; then
            log "Container restarted successfully"
            send_alert "Container Restarted" "ChoreQuest container has been restarted and is now running."
        else
            log "CRITICAL: Failed to restart container"
            send_alert "Critical: Restart Failed" "Failed to restart ChoreQuest container. Manual intervention required."
            return 1
        fi
    fi
    return 0
}

check_container_health() {
    local health_status=$(docker inspect --format='{{.State.Health.Status}}' "$CONTAINER_NAME" 2>/dev/null || echo "unknown")
    
    if [ "$health_status" != "healthy" ]; then
        log "WARNING: Container health status: $health_status"
        
        if [ "$health_status" = "unhealthy" ]; then
            send_alert "Container Unhealthy" "ChoreQuest container is unhealthy. Check logs for details."
        fi
        return 1
    fi
    return 0
}

check_health_endpoint() {
    if command -v curl &> /dev/null; then
        if ! curl -f -s "$HEALTH_ENDPOINT" > /dev/null; then
            log "WARNING: Health endpoint not responding"
            return 1
        fi
    fi
    return 0
}

check_disk_space() {
    local data_path="${DATA_PATH:-./data}"
    local backup_path="${BACKUP_PATH:-./backups}"
    
    if [ -d "$data_path" ]; then
        local data_usage=$(df -h "$data_path" | tail -1 | awk '{print $5}' | sed 's/%//')
        if [ "$data_usage" -gt 80 ]; then
            log "WARNING: Data volume at ${data_usage}% capacity"
            send_alert "Disk Space Warning" "Data volume is at ${data_usage}% capacity. Consider cleaning up old data."
        fi
    fi
    
    if [ -d "$backup_path" ]; then
        local backup_usage=$(df -h "$backup_path" | tail -1 | awk '{print $5}' | sed 's/%//')
        if [ "$backup_usage" -gt 80 ]; then
            log "WARNING: Backup volume at ${backup_usage}% capacity"
            send_alert "Disk Space Warning" "Backup volume is at ${backup_usage}% capacity. Consider cleaning up old backups."
        fi
    fi
}

check_memory_usage() {
    local memory_usage=$(docker stats --no-stream --format "{{.MemPerc}}" "$CONTAINER_NAME" | sed 's/%//')
    
    if (( $(echo "$memory_usage > 90" | bc -l) )); then
        log "WARNING: High memory usage: ${memory_usage}%"
        send_alert "High Memory Usage" "ChoreQuest container is using ${memory_usage}% of allocated memory."
    fi
}

check_recent_backups() {
    local backup_path="${BACKUP_PATH:-./backups}"
    
    if [ -d "$backup_path" ]; then
        local latest_backup=$(find "$backup_path" -name "chorequest_backup_*.tar.gz" -type f -mtime -2 | head -1)
        
        if [ -z "$latest_backup" ]; then
            log "WARNING: No backup found in the last 48 hours"
            send_alert "Backup Missing" "No recent backup found for ChoreQuest. Check backup service."
        fi
    fi
}

main() {
    log "Starting health check..."
    
    local issues=0
    
    if ! check_container_running; then
        ((issues++))
    fi
    
    if ! check_container_health; then
        ((issues++))
    fi
    
    if ! check_health_endpoint; then
        ((issues++))
    fi
    
    check_disk_space
    check_memory_usage
    check_recent_backups
    
    if [ $issues -eq 0 ]; then
        log "Health check passed. All systems operational."
    else
        log "Health check completed with $issues issue(s)"
    fi
}

main "$@"
