# 🏆 ChoreQuest

**ChoreQuest** is a comprehensive family chore management application designed to help parents organize, track, and reward their children's daily tasks. With a simple child-friendly interface and powerful parent management tools, ChoreQuest makes household chores engaging and rewarding for the whole family.

![ChoreQuest](https://img.shields.io/badge/version-1.0.0-brightgreen) ![License](https://img.shields.io/badge/license-MIT-blue) ![React](https://img.shields.io/badge/React-19.2.0-61dafb) ![TypeScript](https://img.shields.io/badge/TypeScript-5.7.3-3178c6) ![Docker](https://img.shields.io/badge/Docker-Ready-2496ED)

---

## ✨ Features

### 🎯 Core Features
- **Child-Friendly Interface** - Simple, intuitive tablet-optimized interface for children
- **Parent Dashboard** - Comprehensive management panel with full control
- **Flexible Chore Scheduling** - Daily, weekly, bi-weekly, and custom repeat patterns
- **Points & Rewards System** - Multiple point categories for different reward types
- **Real-Time Progress Tracking** - Live updates on chore completion and point balances

### 📅 Advanced Scheduling
- AM/PM time-based chores (e.g., "Brush Teeth" twice daily)
- Specific time windows (e.g., complete between 5-8pm)
- Day-of-week assignments (e.g., every Monday, Wednesday)
- Complex patterns (e.g., "every other Monday")
- Optional start/end dates for seasonal chores
- Child-specific schedules per chore

### 🎁 Rewards & Shop
- Virtual rewards shop where children spend earned points
- Multiple point categories (e.g., "Regular" and "Extra" points)
- Point swapping between categories
- Reward expiry and availability dates
- Purchase limits (per child, per day/week/month)
- Goal tracking to help children save for special rewards
- Custom point costs per child

### 👨‍👩‍👧‍👦 Family Management
- Multiple child profiles with avatars
- Per-child chore assignments
- Custom point rewards per child per chore
- Shareable chores (multiple children can complete together)
- Missed chore tracking and management
- Chore completion approval workflow

### 🎨 Engaging Experience
- Celebration animations on chore completion (confetti, fireworks, sparkles, etc.)
- Goal progress visualization
- Category-specific point displays
- Weather-based seasonal themes
- Voice reading for upcoming chores
- Weather-appropriate chore suggestions

### 📊 Reporting & Analytics
- Weekly activity reports
- Customizable report templates
- Points history tracking with earned/expired points
- Chore completion history
- Purchase history and fulfillment tracking
- Undo history with timestamps

### 🔒 Security & Access Control
- PIN-protected parent mode
- Optional biometric authentication
- PIN brute-force protection with lockout
- IP address restrictions with override PIN
- Welcome page for unauthorized access
- Secure parent approval workflows

### 📧 Communication
- Email alerts for reward purchases
- Pending approval notifications
- Digest mode for batched notifications
- SMTP configuration for email delivery
- Customizable email templates

### 📆 Calendar Integration
- ICS feed import per child
- "On This Day" event display
- 7-day calendar preview
- Manual and auto-refresh options
- Optional event time display

### 🌤️ Weather Integration
- Live weather display by location
- Child-friendly temperature descriptions
- Automatic Celsius/Fahrenheit based on location
- Weather-appropriate chore suggestions
- Seasonal theme color schemes

---

## 🚀 Installation

### Prerequisites
- Docker and Docker Compose installed on your system
- Node.js 20+ (for local development)
- A modern web browser

### 🐳 Docker Installation (Recommended)

ChoreQuest includes a complete Docker setup with automated CI/CD pipelines.

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/chorequest.git
   cd chorequest
   ```

2. **Quick Start with Docker Compose**
   ```bash
   # Build and start the application
   docker-compose up -d
   
   # Access the application
   open http://localhost:8080
   ```

3. **Using the Deploy Script**
   ```bash
   # Make script executable
   chmod +x scripts/deploy.sh
   
   # Build and start
   ./scripts/deploy.sh start
   
   # View logs
   ./scripts/deploy.sh logs
   
   # Stop application
   ./scripts/deploy.sh stop
   ```

4. **Using Pre-built Images**
   ```bash
   # Pull from GitHub Container Registry
   docker pull ghcr.io/OWNER/chorequest:latest
   
   # Run the container
   docker run -d \
     --name chorequest \
     -p 8080:80 \
     --restart unless-stopped \
     ghcr.io/OWNER/chorequest:latest
   ```

### 🔧 Docker Commands

```bash
# Build the image
docker-compose build

# Start in detached mode
docker-compose up -d

# Stop the containers
docker-compose down

# View logs
docker-compose logs -f

# Restart the container
docker-compose restart

# Remove everything including volumes
docker-compose down -v
```

### 🔄 CI/CD Pipeline

ChoreQuest includes automated GitHub Actions workflows:

- **Continuous Integration**: Automatic testing, linting, and building on every push
- **Docker Builds**: Multi-architecture images (amd64, arm64, arm/v7) pushed to GHCR
- **Security Scanning**: Automated vulnerability scanning with Trivy
- **Release Pipeline**: Tagged releases with versioned Docker images

#### 🔑 GitHub Secrets Setup

To enable Docker Hub publishing (optional), you need to configure GitHub repository secrets:

1. **Required Secrets:**
   - `DOCKERHUB_USERNAME` - Your Docker Hub username
   - `DOCKERHUB_TOKEN` - Docker Hub access token

2. **Setup Instructions:**
   - See [GITHUB_SECRETS_SETUP.md](./GITHUB_SECRETS_SETUP.md) for detailed step-by-step guide
   - Or follow the quick steps below

**Quick Setup:**
```bash
# 1. Create Docker Hub access token at hub.docker.com
# 2. Add secrets to GitHub repository:
#    Settings → Secrets and variables → Actions → New repository secret
#    - Name: DOCKERHUB_USERNAME, Value: your-dockerhub-username
#    - Name: DOCKERHUB_TOKEN, Value: your-access-token
```

**Note:** If Docker Hub secrets are not configured, images will only be pushed to GitHub Container Registry (GHCR), which works automatically.

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed CI/CD and deployment documentation.

---

## 📱 Progressive Web App (PWA)

ChoreQuest is a fully-featured Progressive Web App that can be installed on mobile devices and desktops for an app-like experience.

### ✨ PWA Features

- **🚀 Offline Support** - Access chores and view progress even without internet
- **📲 Installable** - Add to home screen on iOS, Android, and desktop
- **⚡ Fast Loading** - Optimized caching for instant app startup
- **🔔 Full Screen Mode** - Immersive app experience without browser UI
- **🎯 App Shortcuts** - Quick access to Parent Mode from home screen

### 📲 Installation Instructions

#### **iOS (iPhone/iPad)**
1. Open ChoreQuest in Safari
2. Tap the Share button (square with arrow pointing up)
3. Scroll down and tap "Add to Home Screen"
4. Tap "Add" in the top right corner
5. ChoreQuest will appear on your home screen like a native app

#### **Android**
1. Open ChoreQuest in Chrome
2. Tap the menu button (three dots) in the top right
3. Select "Install app" or "Add to Home screen"
4. Tap "Install" in the popup
5. ChoreQuest will appear in your app drawer

#### **Desktop (Chrome/Edge)**
1. Open ChoreQuest in Chrome or Edge
2. Look for the install icon (⊕ or computer icon) in the address bar
3. Click the icon and select "Install"
4. ChoreQuest will open in its own window

Alternatively, click the three-dot menu → "Install ChoreQuest"

### 🎨 PWA Customization

The PWA manifest is configured in `/public/manifest.json`. You can customize:
- App name and description
- Theme colors
- App icons (located in `/public/icons/`)
- Display mode (standalone, fullscreen, etc.)
- App shortcuts

### 🔄 Service Worker

The service worker (`/public/service-worker.js`) handles:
- Offline caching
- Background sync
- Push notifications (future feature)
- Automatic updates

When a new version is available, users will be prompted to reload the app.

---

### 💻 Local Development Installation

If you prefer to run without Docker:

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/chorequest.git
   cd chorequest
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Access the application**
   
   Open your browser and navigate to:
   ```
   http://localhost:5173
   ```

### 🏗️ Build for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

### 🚢 Deployment Options

ChoreQuest can be deployed to various platforms:

- **Docker** (recommended) - See docker-compose.yml
- **Vercel** - `vercel --prod`
- **Netlify** - `netlify deploy --prod --dir=dist`
- **GitHub Pages** - Use included GitHub Actions workflow
- **AWS S3 + CloudFront** - Static hosting
- **Any static host** - Upload `dist` folder

For detailed deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md).

---

## 🎮 Getting Started

### Initial Setup

1. **Access ChoreQuest** - Navigate to the application URL in your browser

2. **Set Parent PIN** - On first access, you'll be prompted to create a Parent Mode PIN

3. **Enter Parent Mode** - Click the gear icon to enter Parent Mode using your PIN

4. **Add Children**
   - Navigate to "Children" tab
   - Click "Add Child"
   - Enter name, optional avatar emoji, and pin (if desired)

5. **Create Categories** (Optional)
   - Navigate to "Categories" tab
   - Create point categories like "Regular" and "Extra"
   - Configure point swaps if desired

6. **Add Chores**
   - Navigate to "Chores" tab
   - Click "Add Chore"
   - Set name, description, points, and schedule
   - Assign to children

7. **Create Rewards**
   - Navigate to "Rewards" tab
   - Click "Add Reward"
   - Set name, description, cost, and categories
   - Configure limits and availability

8. **Exit Parent Mode** - Children can now start completing chores!

### Daily Usage

**For Children:**
1. Select your profile from the home screen
2. View your assigned chores for the day
3. Complete chores by clicking the checkmark
4. Watch your points grow!
5. Visit the shop to redeem rewards

**For Parents:**
1. Enter Parent Mode with your PIN
2. Monitor chore completions
3. Approve pending completions (if configured)
4. Fulfill reward purchases
5. Manage missed chores
6. View reports and history

---

## ⚙️ Configuration

### Email Alerts

Configure SMTP settings in Parent Mode > Settings > Email Settings:

```
SMTP Host: smtp.gmail.com
SMTP Port: 587
Security: TLS
Username: your-email@gmail.com
Password: your-app-password
From Email: your-email@gmail.com
From Name: ChoreQuest
```

**Note:** For Gmail, you'll need to use an [App Password](https://support.google.com/accounts/answer/185833).

### Weather Integration

1. Navigate to Parent Mode > Settings > Weather
2. Enter your location (city, country)
3. The app will automatically detect coordinates
4. Choose temperature unit (Auto, Celsius, or Fahrenheit)
5. Enable seasonal themes for automatic color scheme changes

### IP Restrictions

For enhanced security, restrict access by IP address:

1. Navigate to Parent Mode > Security > IP Restrictions
2. Enable IP restrictions
3. Add allowed IP addresses in CIDR notation (e.g., 192.168.1.0/24)
4. Set an override PIN for access from unapproved IPs
5. Optionally require PIN even for approved IPs

### Calendar Integration

Connect external calendars for each child:

1. Edit a child's profile in Parent Mode
2. Paste the ICS feed URL
3. Set auto-refresh interval
4. Enable/disable event time display
5. Events will appear in "On This Day" and Calendar view

---

## 🛠️ Technology Stack

- **Frontend Framework:** React 19.2.0 with TypeScript
- **UI Components:** Radix UI + shadcn/ui v4
- **Styling:** Tailwind CSS v4
- **Icons:** Phosphor Icons
- **Animations:** Framer Motion
- **State Management:** React Hooks + useKV (Spark SDK)
- **Date Handling:** date-fns
- **Charts:** Recharts
- **Build Tool:** Vite
- **Notifications:** Sonner

---

## 📱 Browser Support

ChoreQuest works best on:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

Optimized for tablets and desktop displays.

---

## 🔐 Data & Privacy

- All data is stored locally using the Spark KV store
- No data is sent to external servers (except optional email notifications)
- Weather data fetched from Open-Meteo (privacy-friendly, no API key required)
- Calendar feeds are fetched directly from provided URLs
- IP addresses logged only for security features when enabled

---

## 🐛 Troubleshooting

### Docker Issues

**Container won't start:**
```bash
# Check logs
docker-compose logs chorequest

# Rebuild from scratch
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

**Port already in use:**
```bash
# Change port in docker-compose.yml
ports:
  - "8080:3000"  # Use port 8080 instead
```

### Application Issues

**Chores not appearing:**
- Verify chores are assigned to the child
- Check the schedule settings (days of week, repeat pattern)
- Ensure chores are not outside their start/end date range

**Points not calculating correctly:**
- Check category assignments on chores and rewards
- Verify point overrides for specific children
- Review point swap history

**Email not sending:**
- Verify SMTP settings are correct
- Check that email alerts are enabled
- For Gmail, ensure you're using an App Password
- Check browser console for errors

**Weather not loading:**
- Verify location is entered correctly
- Check internet connection
- Coordinates must be properly detected

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📚 Documentation

ChoreQuest includes comprehensive documentation:

- **[README.md](./README.md)** - Main project overview (you are here)
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Complete deployment guide
- **[CI-CD.md](./CI-CD.md)** - CI/CD pipeline configuration
- **[GITHUB_SECRETS_SETUP.md](./GITHUB_SECRETS_SETUP.md)** - Docker secrets setup (detailed)
- **[SECRETS_QUICK_REFERENCE.md](./SECRETS_QUICK_REFERENCE.md)** - Quick secrets reference
- **[SECRETS_VISUAL_GUIDE.md](./SECRETS_VISUAL_GUIDE.md)** - Visual guide with diagrams
- **[PWA_GUIDE.md](./PWA_GUIDE.md)** - Progressive Web App guide
- **[PWA_QUICKSTART.md](./PWA_QUICKSTART.md)** - Quick PWA setup
- **[SECURITY.md](./SECURITY.md)** - Security policies

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

The Spark Template files and resources from GitHub are licensed under the terms of the MIT license, Copyright GitHub, Inc.

---

## 🙏 Acknowledgments

- Built with [GitHub Spark](https://githubnext.com/projects/spark)
- UI components from [shadcn/ui](https://ui.shadcn.com)
- Icons from [Phosphor Icons](https://phosphoricons.com)
- Weather data from [Open-Meteo](https://open-meteo.com)

---

## 📞 Support

For issues, questions, or suggestions:
- Open an [Issue](https://github.com/yourusername/chorequest/issues)
- Check the [Discussions](https://github.com/yourusername/chorequest/discussions)

---

## 🗺️ Roadmap

Future enhancements under consideration:
- Mobile app (iOS/Android)
- Multi-family support
- Chore marketplace/sharing
- Gamification badges and achievements
- Integration with smart home devices
- Voice assistant integration
- Photo proof for chore completion
- Allowance management
- Savings goals tracking

---

**Made with ❤️ for families**
