# 🔑 Quick Reference: GitHub Secrets for Docker

This is a quick reference card for setting up Docker secrets. For detailed instructions, see [GITHUB_SECRETS_SETUP.md](./GITHUB_SECRETS_SETUP.md).

## Required Secrets

| Secret Name | Required? | Where to Get It | Purpose |
|-------------|-----------|-----------------|---------|
| `DOCKERHUB_USERNAME` | Optional | Your Docker Hub username | Push images to Docker Hub |
| `DOCKERHUB_TOKEN` | Optional | [hub.docker.com](https://hub.docker.com) → Account Settings → Security → New Access Token | Authenticate with Docker Hub |
| `GITHUB_TOKEN` | Automatic | Provided automatically by GitHub | Push images to GHCR |

## Quick Setup Steps

### Option 1: Docker Hub (Recommended for Public Projects)

```bash
1. Go to https://hub.docker.com
2. Login → Account Settings → Security
3. Click "New Access Token"
4. Description: "ChoreQuest CI/CD"
5. Permissions: Read, Write, Delete
6. Copy the token (you won't see it again!)

7. Go to your GitHub repository
8. Settings → Secrets and variables → Actions
9. Click "New repository secret"
10. Add two secrets:
    - Name: DOCKERHUB_USERNAME
      Value: your-dockerhub-username
    - Name: DOCKERHUB_TOKEN
      Value: paste-the-token-here
```

### Option 2: GitHub Container Registry Only (Automatic)

No setup needed! The workflow will automatically use GHCR.

## Testing Your Setup

```bash
# Go to your repository
Actions → Docker Release → Run workflow → Run workflow

# Check the logs for:
✅ "Login to Docker Hub" (if configured)
✅ "Build and push to GHCR"
✅ "Build and push to Docker Hub" (if configured)
```

## Using Your Published Images

```bash
# From GitHub Container Registry (always available)
docker pull ghcr.io/YOUR_USERNAME/chorequest:latest

# From Docker Hub (if configured)
docker pull YOUR_DOCKERHUB_USERNAME/chorequest:latest
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Secret not found" error | Check secret name spelling (case-sensitive) |
| "Authentication failed" | Regenerate Docker Hub token and update secret |
| Workflow doesn't run | Check Actions are enabled in Settings → Actions |
| Images not in Docker Hub | Verify both USERNAME and TOKEN secrets are set |

## Security Notes

- ✅ Use access tokens, NOT your Docker Hub password
- ✅ Set minimum required permissions
- ✅ Rotate tokens every 6-12 months
- ❌ Never commit tokens to your repository
- ❌ Never share tokens in unsecured channels

## Need Help?

- 📖 Full Guide: [GITHUB_SECRETS_SETUP.md](./GITHUB_SECRETS_SETUP.md)
- 🚀 Deployment Guide: [DEPLOYMENT.md](./DEPLOYMENT.md)
- 🐛 Issues: [Open an issue](https://github.com/yourusername/chorequest/issues)
