# 🔐 GitHub Secrets Setup Guide

This guide will walk you through setting up Docker secrets in your GitHub repository to enable automated Docker builds and deployments.

## 📋 Overview

ChoreQuest's CI/CD pipeline requires specific secrets to be configured in your GitHub repository settings to:
- Push Docker images to Docker Hub
- Push Docker images to GitHub Container Registry (GHCR)
- Authenticate with registries during build process

## 🔑 Required Secrets

### Docker Hub Secrets (Optional but Recommended)

| Secret Name | Description | Example Value |
|------------|-------------|---------------|
| `DOCKERHUB_USERNAME` | Your Docker Hub username | `yourDockerHubUsername` |
| `DOCKERHUB_TOKEN` | Docker Hub access token (NOT your password) | `dckr_pat_...` |

### GitHub Container Registry Secrets (Automatic)

| Secret Name | Description | Notes |
|------------|-------------|-------|
| `GITHUB_TOKEN` | GitHub automatic token | Automatically provided by GitHub Actions |

---

## 🚀 Step-by-Step Setup

### Step 1: Create Docker Hub Access Token

1. **Log in to Docker Hub**
   - Go to [hub.docker.com](https://hub.docker.com)
   - Sign in with your credentials

2. **Navigate to Account Settings**
   - Click on your username in the top-right corner
   - Select **Account Settings** from the dropdown

3. **Create Access Token**
   - Click on **Security** tab in the left sidebar
   - Click the **New Access Token** button
   - Enter a description: `ChoreQuest CI/CD`
   - Set permissions: **Read, Write, Delete**
   - Click **Generate**

4. **Copy the Token**
   - ⚠️ **IMPORTANT:** Copy the token immediately - you won't be able to see it again!
   - Store it temporarily in a secure location (password manager recommended)

### Step 2: Add Secrets to GitHub Repository

1. **Navigate to Repository Settings**
   - Go to your ChoreQuest repository on GitHub
   - Click the **Settings** tab (you need admin access)

2. **Access Secrets Section**
   - In the left sidebar, expand **Secrets and variables**
   - Click on **Actions**

3. **Add Docker Hub Username**
   - Click the **New repository secret** button
   - Name: `DOCKERHUB_USERNAME`
   - Value: Your Docker Hub username (e.g., `johndoe`)
   - Click **Add secret**

4. **Add Docker Hub Token**
   - Click the **New repository secret** button again
   - Name: `DOCKERHUB_TOKEN`
   - Value: Paste the access token you copied earlier
   - Click **Add secret**

### Step 3: Verify Setup

1. **Check Secrets List**
   - You should now see both secrets in the repository secrets list:
     - `DOCKERHUB_USERNAME`
     - `DOCKERHUB_TOKEN`

2. **Test the Workflow**
   - Navigate to the **Actions** tab in your repository
   - Select the **Docker Release** workflow
   - Click **Run workflow** button (top right)
   - Select the branch and click **Run workflow**
   
3. **Monitor Workflow Execution**
   - Watch the workflow run in real-time
   - Check for successful authentication with Docker Hub
   - Verify images are pushed successfully

---

## 🖼️ Visual Guide

### Finding GitHub Repository Settings

```
Your Repository → Settings (tab) → Secrets and variables → Actions
```

### Adding a New Secret

```
Actions secrets page → New repository secret button
↓
Enter secret name (e.g., DOCKERHUB_USERNAME)
↓
Enter secret value
↓
Click "Add secret"
```

---

## 🐳 Docker Hub vs GitHub Container Registry

The CI/CD pipeline supports both registries:

### GitHub Container Registry (GHCR)
- ✅ **Automatic:** Uses built-in `GITHUB_TOKEN`
- ✅ **Free:** No additional setup required
- ✅ **Integrated:** Tight GitHub integration
- 📦 **Images:** `ghcr.io/OWNER/chorequest:latest`

### Docker Hub
- ⚙️ **Manual:** Requires username and token setup
- 🌍 **Popular:** Widely used and recognized
- 🔗 **Public:** Easy to share and discover
- 📦 **Images:** `USERNAME/chorequest:latest`

**Recommendation:** Configure both for maximum flexibility!

---

## 🔒 Security Best Practices

### Do's ✅
- ✅ Use access tokens instead of passwords
- ✅ Set minimum required permissions (Read, Write for CI/CD)
- ✅ Use descriptive token names (e.g., "ChoreQuest CI/CD")
- ✅ Rotate tokens periodically (every 6-12 months)
- ✅ Delete unused or compromised tokens immediately
- ✅ Store tokens in a password manager

### Don'ts ❌
- ❌ Never commit tokens to the repository
- ❌ Don't share tokens via unsecured channels (email, chat)
- ❌ Don't use your Docker Hub password as a secret
- ❌ Don't grant unnecessary permissions
- ❌ Don't reuse tokens across multiple projects

---

## 🐛 Troubleshooting

### Secret Not Found Error

**Error Message:**
```
Error: secrets.DOCKERHUB_USERNAME is undefined
```

**Solution:**
1. Verify the secret name exactly matches (case-sensitive)
2. Check you added the secret to the correct repository
3. Ensure you have admin access to the repository
4. Re-add the secret if necessary

### Authentication Failed

**Error Message:**
```
Error: denied: incorrect username or password
```

**Solutions:**
1. **For Docker Hub:**
   - Verify `DOCKERHUB_USERNAME` is correct (check for typos)
   - Regenerate the Docker Hub access token
   - Update `DOCKERHUB_TOKEN` secret with new token
   - Ensure token has Write permissions

2. **For GHCR:**
   - Check repository permissions (Settings → Actions → General)
   - Ensure workflow has `packages: write` permission
   - Verify `GITHUB_TOKEN` is not restricted

### Token Expired or Revoked

**Error Message:**
```
Error: unauthorized: authentication required
```

**Solution:**
1. Go to Docker Hub → Security
2. Check if token is still active
3. If revoked or expired, create a new token
4. Update the `DOCKERHUB_TOKEN` secret in GitHub

### Workflow Not Triggering

**Possible Issues:**
1. **Check workflow file syntax:**
   ```bash
   # Validate YAML syntax
   cat .github/workflows/docker-release.yml | yamllint -
   ```

2. **Verify trigger conditions:**
   - Workflow runs on releases and manual dispatch
   - Create a test release or use "Run workflow" button

3. **Check repository permissions:**
   - Settings → Actions → General
   - Ensure "Allow all actions and reusable workflows" is selected

---

## 📝 Workflow Configuration

The Docker release workflow (`.github/workflows/docker-release.yml`) is configured to:

1. **Build multi-architecture images:**
   - `linux/amd64` (Intel/AMD)
   - `linux/arm64` (Apple Silicon, Raspberry Pi 4)
   - `linux/arm/v7` (Older Raspberry Pi)

2. **Push to registries:**
   - GitHub Container Registry (always)
   - Docker Hub (only if secrets are configured)

3. **Create multiple tags:**
   - Version tag (from release, e.g., `v1.0.0`)
   - `latest` tag (always)

### Making Secrets Optional

The workflow checks if Docker Hub secrets exist before attempting to push:

```yaml
- name: Log in to Docker Hub
  if: ${{ secrets.DOCKERHUB_USERNAME != '' }}
```

This means:
- ✅ If secrets are configured → Images pushed to both registries
- ✅ If secrets NOT configured → Images only pushed to GHCR (still works!)

---

## 🧪 Testing Your Setup

### Manual Test

1. Navigate to repository **Actions** tab
2. Select **Docker Release** workflow
3. Click **Run workflow**
4. Select branch: `main`
5. Click **Run workflow** button
6. Monitor the build process

### Expected Results

- ✅ Build completes successfully
- ✅ Images appear in GitHub Packages
- ✅ Images appear in Docker Hub (if configured)
- ✅ Multiple architectures available

### Verification Commands

```bash
# Pull from GitHub Container Registry
docker pull ghcr.io/OWNER/chorequest:latest

# Pull from Docker Hub (if configured)
docker pull USERNAME/chorequest:latest

# Check image architectures
docker manifest inspect ghcr.io/OWNER/chorequest:latest
```

---

## 🔄 Updating Secrets

### When to Update
- Token is compromised
- Token expires (check Docker Hub security settings)
- Changing Docker Hub account
- Regular security maintenance (recommended annually)

### How to Update

1. **Create new token** in Docker Hub
2. **Update secret** in GitHub:
   - Settings → Secrets and variables → Actions
   - Click on the secret name
   - Click **Update secret**
   - Paste new value
   - Click **Update secret**
3. **Test** by running the workflow manually

---

## 🆘 Getting Help

If you encounter issues:

1. **Check GitHub Actions logs:**
   - Actions tab → Failed workflow → Click on failed job
   - Expand failed steps to see detailed error messages

2. **Verify credentials locally:**
   ```bash
   # Test Docker Hub login
   echo YOUR_TOKEN | docker login -u YOUR_USERNAME --password-stdin
   
   # Test GHCR login
   echo YOUR_GITHUB_TOKEN | docker login ghcr.io -u YOUR_USERNAME --password-stdin
   ```

3. **Common solutions:**
   - Regenerate tokens
   - Check repository permissions
   - Verify workflow file syntax
   - Review GitHub Actions documentation

4. **Community support:**
   - Open an issue in the repository
   - Check GitHub Community Forums
   - Review Docker Hub documentation

---

## ✅ Setup Checklist

Use this checklist to ensure everything is configured correctly:

- [ ] Docker Hub account created
- [ ] Docker Hub access token generated with Write permissions
- [ ] Token saved in secure location
- [ ] `DOCKERHUB_USERNAME` secret added to GitHub repository
- [ ] `DOCKERHUB_TOKEN` secret added to GitHub repository
- [ ] Secrets verified in repository settings
- [ ] Test workflow run completed successfully
- [ ] Images visible in GitHub Container Registry
- [ ] Images visible in Docker Hub (if configured)
- [ ] Multi-architecture support verified
- [ ] Token information documented for future reference

---

## 📚 Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GitHub Secrets Documentation](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Docker Hub Access Tokens](https://docs.docker.com/docker-hub/access-tokens/)
- [GitHub Container Registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)
- [Docker Build Push Action](https://github.com/docker/build-push-action)

---

**🎉 Congratulations!** Once you've completed this setup, your ChoreQuest repository will automatically build and publish Docker images whenever you create a release or manually trigger the workflow.
