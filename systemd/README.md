# ChoreQuest Systemd Service Setup

This directory contains systemd service files for managing ChoreQuest as a system service.

## Installation

### 1. Copy Service File

```bash
sudo cp systemd/chorequest.service /etc/systemd/system/
sudo chmod 644 /etc/systemd/system/chorequest.service
```

### 2. Update WorkingDirectory

Edit the service file to point to your ChoreQuest installation:

```bash
sudo nano /etc/systemd/system/chorequest.service
```

Change `WorkingDirectory=/opt/chorequest` to your actual path.

### 3. Reload Systemd

```bash
sudo systemctl daemon-reload
```

### 4. Enable Service

```bash
sudo systemctl enable chorequest.service
```

### 5. Start Service

```bash
sudo systemctl start chorequest.service
```

## Usage

### Check Status
```bash
sudo systemctl status chorequest.service
```

### Start Service
```bash
sudo systemctl start chorequest.service
```

### Stop Service
```bash
sudo systemctl stop chorequest.service
```

### Restart Service
```bash
sudo systemctl restart chorequest.service
```

### Enable Auto-start
```bash
sudo systemctl enable chorequest.service
```

### Disable Auto-start
```bash
sudo systemctl disable chorequest.service
```

### View Logs
```bash
sudo journalctl -u chorequest.service -f
```

## Monitoring Service

### Setup Cron for Health Checks

```bash
# Edit crontab
sudo crontab -e

# Add health check every 5 minutes
*/5 * * * * /opt/chorequest/scripts/monitor.sh

# Add backup check daily
0 3 * * * /opt/chorequest/scripts/health-check.sh
```

## Troubleshooting

### Service fails to start

Check logs:
```bash
sudo journalctl -u chorequest.service -n 50
```

Check Docker:
```bash
sudo systemctl status docker.service
```

### Permission issues

Ensure user has Docker permissions:
```bash
sudo usermod -aG docker $USER
```

### Service doesn't auto-start

```bash
sudo systemctl is-enabled chorequest.service
sudo systemctl enable chorequest.service
```
