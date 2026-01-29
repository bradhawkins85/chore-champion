.PHONY: help build up down restart logs backup restore update health clean

COMPOSE_FILE ?= docker-compose.yml
PROJECT_NAME = chorequest

help: ## Show this help message
	@echo "ChoreQuest Docker Management"
	@echo "============================"
	@echo ""
	@echo "Available commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'
	@echo ""
	@echo "Deployment modes:"
	@echo "  make up                    # Development"
	@echo "  make up-prod              # Production with backups"
	@echo "  make up-traefik           # Production with SSL"

build: ## Build Docker images
	docker compose -f $(COMPOSE_FILE) build --no-cache

up: ## Start services (development)
	docker compose up -d

up-prod: ## Start services (production)
	docker compose -f docker-compose.prod.yml up -d

up-traefik: ## Start services (production with Traefik)
	docker compose -f docker-compose.traefik.yml up -d

down: ## Stop and remove services
	docker compose -f $(COMPOSE_FILE) down

down-prod: ## Stop production services
	docker compose -f docker-compose.prod.yml down

down-traefik: ## Stop Traefik services
	docker compose -f docker-compose.traefik.yml down

restart: ## Restart services
	docker compose -f $(COMPOSE_FILE) restart

restart-prod: ## Restart production services
	docker compose -f docker-compose.prod.yml restart

logs: ## View logs (follow)
	docker compose -f $(COMPOSE_FILE) logs -f

logs-prod: ## View production logs
	docker compose -f docker-compose.prod.yml logs -f

ps: ## Show running containers
	docker compose ps

health: ## Run health check
	@./scripts/health-check.sh

backup: ## Create manual backup
	@docker exec chorequest-backup /scripts/backup.sh

restore: ## Restore from backup (usage: make restore BACKUP=filename.tar.gz)
	@docker exec -it chorequest-backup /scripts/restore.sh $(BACKUP)

update: ## Update to latest version
	@./scripts/update.sh

deploy: ## Deploy production
	@./scripts/deploy.sh

clean: ## Clean up unused Docker resources
	docker system prune -f

clean-all: ## Clean everything including volumes (⚠️  DELETES DATA)
	docker compose down -v
	docker system prune -a -f

init: ## Initialize production environment
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo "✓ Created .env file - please configure it"; \
	else \
		echo "✓ .env file already exists"; \
	fi
	@mkdir -p data backups
	@chmod +x scripts/*.sh
	@echo "✓ Created data directories"
	@echo "✓ Made scripts executable"
	@echo ""
	@echo "Next steps:"
	@echo "  1. Edit .env file with your configuration"
	@echo "  2. Run 'make deploy' or 'make up-prod'"

stats: ## Show resource usage
	docker stats chorequest-app --no-stream

shell: ## Open shell in app container
	docker exec -it chorequest-app sh

shell-backup: ## Open shell in backup container
	docker exec -it chorequest-backup sh

volumes: ## Show volume information
	@echo "Volumes:"
	@docker volume ls | grep chorequest
	@echo ""
	@echo "Volume sizes:"
	@docker system df -v | grep chorequest

backup-list: ## List available backups
	@ls -lh backups/*.tar.gz 2>/dev/null || echo "No backups found"

config: ## Validate and show Docker Compose config
	docker compose config

config-prod: ## Validate and show production config
	docker compose -f docker-compose.prod.yml config

config-traefik: ## Validate and show Traefik config
	docker compose -f docker-compose.traefik.yml config
