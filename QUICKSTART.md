# ChoreQuest Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Using Docker (Easiest)

1. **Install Docker**
   - Download from [docker.com](https://www.docker.com/get-started)
   - Install Docker Desktop for your operating system

2. **Download ChoreQuest**
   ```bash
   git clone https://github.com/yourusername/chorequest.git
   cd chorequest
   ```

3. **Start the App**
   ```bash
   docker-compose up -d
   ```

4. **Open ChoreQuest**
   - Navigate to: http://localhost:3000
   - Done! 🎉

### First Time Setup

1. **Create Parent PIN**
   - Enter a 4-digit PIN when prompted
   - Remember this - you'll need it to access Parent Mode

2. **Add Your First Child**
   - Click the gear icon (Parent Mode)
   - Enter your PIN
   - Go to "Children" tab
   - Click "Add Child"
   - Enter name and pick an emoji

3. **Create Your First Chore**
   - Go to "Chores" tab
   - Click "Add Chore"
   - Example: "Make Bed"
     - Name: Make Bed
     - Description: Straighten sheets and pillows
     - Points: 10
     - Time: Morning (AM)
     - Days: Every Day
   - Assign to your child
   - Click "Create Chore"

4. **Create Your First Reward**
   - Go to "Rewards" tab
   - Click "Add Reward"
   - Example: "Extra Screen Time"
     - Name: 30 Minutes Screen Time
     - Description: Earn extra tablet/TV time
     - Cost: 50 points
   - Click "Create Reward"

5. **Exit Parent Mode**
   - Click "Exit Parent Mode" button
   - Your child can now start completing chores!

### Daily Workflow

**Morning:**
1. Child selects their profile
2. Sees "Make Bed" chore
3. Completes the chore (after making bed)
4. Clicks the checkmark ✓
5. Celebration animation plays! 🎉
6. Points are added

**Evening:**
1. Child checks their points
2. Visits the Shop
3. Purchases a reward
4. Parent gets notification (if email setup)
5. Parent fulfills the reward

### Tips & Tricks

✅ **Start Simple** - Add 2-3 chores and 1-2 rewards to begin

✅ **Age Appropriate** - Younger children (4-7): simple chores, fewer choices
   Older children (8+): more responsibility, more reward options

✅ **Point Values**
   - Easy tasks (5 minutes): 10 points
   - Medium tasks (15 minutes): 20 points
   - Hard tasks (30+ minutes): 50 points
   - Rewards: 50-200 points

✅ **Categories** - Use "Regular" for daily chores, "Extra" for special tasks

✅ **Be Consistent** - Check and approve chores daily for best results

### Common Chores by Age

**Ages 4-6:**
- Make bed (10 pts)
- Put toys away (10 pts)
- Feed pet (15 pts)
- Help set table (10 pts)

**Ages 7-9:**
- Brush teeth AM/PM (5 pts each)
- Make bed (10 pts)
- Clear dishes (15 pts)
- Take out trash (20 pts)
- Homework (30 pts)

**Ages 10+:**
- All of the above, plus:
- Vacuum room (25 pts)
- Do laundry (30 pts)
- Wash dishes (25 pts)
- Help with cooking (30 pts)
- Mow lawn (50 pts)

### Popular Rewards

**Low Cost (50-100 points):**
- 30 min extra screen time
- Choose dinner one night
- Stay up 30 min late
- Pick family movie

**Medium Cost (150-300 points):**
- Friend sleepover
- Special dessert
- Small toy ($10 value)
- Trip to park/playground

**High Cost (500+ points):**
- Big toy ($25+ value)
- Special day trip
- New video game
- Theme park visit

### Need Help?

- 📖 Full documentation: [README.md](README.md)
- 🐛 Report issues: [GitHub Issues](https://github.com/yourusername/chorequest/issues)
- 💬 Ask questions: [Discussions](https://github.com/yourusername/chorequest/discussions)

### Docker Commands Reference

```bash
# Start
docker-compose up -d

# Stop
docker-compose down

# View logs
docker-compose logs -f

# Restart
docker-compose restart

# Update
git pull
docker-compose build
docker-compose up -d

# Backup data
docker cp chorequest:/app/data ./backup

# Complete removal
docker-compose down -v
```

---

**Happy Chore Tracking! 🏆**
