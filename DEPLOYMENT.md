# Production Deployment Guide

This guide covers deploying the TradeJournal backend to production environments.

## 🌐 Deployment Options

### 1. Railway (Recommended for beginners)

**Step 1: Prepare your code**

```bash
# Make sure all files are committed
git add .
git commit -m "Ready for production deployment"
git push origin main
```

**Step 2: Deploy to Railway**

1. Visit [railway.app](https://railway.app)
2. Connect your GitHub repository
3. Railway will automatically detect it's a Node.js app
4. Add environment variables in Railway dashboard

**Environment Variables for Railway:**

```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/tradejournal
JWT_SECRET=your-super-long-random-secret-key-for-production
EMAIL_FROM=your-email@domain.com
EMAIL_HOST=smtp.gmail.com
EMAIL_USER=your-email@domain.com
EMAIL_PASS=your-app-password
FRONTEND_URL=https://your-frontend-domain.com
```

### 2. Heroku

**Step 1: Install Heroku CLI**

```bash
# Install Heroku CLI from https://devcenter.heroku.com/articles/heroku-cli
heroku login
```

**Step 2: Create Heroku app**

```bash
heroku create your-tradejournal-api
```

**Step 3: Set environment variables**

```bash
heroku config:set NODE_ENV=production
heroku config:set MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/tradejournal
heroku config:set JWT_SECRET=your-super-long-random-secret-key
heroku config:set EMAIL_FROM=your-email@domain.com
heroku config:set EMAIL_HOST=smtp.gmail.com
heroku config:set EMAIL_USER=your-email@domain.com
heroku config:set EMAIL_PASS=your-app-password
heroku config:set FRONTEND_URL=https://your-frontend-domain.com
```

**Step 4: Deploy**

```bash
git push heroku main
```

### 3. DigitalOcean App Platform

**Step 1: Create app spec**
Create `.do/app.yaml`:

```yaml
name: tradejournal-backend
services:
  - name: api
    source_dir: /
    github:
      repo: your-username/your-repo
      branch: main
    run_command: npm start
    environment_slug: node-js
    instance_count: 1
    instance_size_slug: basic-xxs
    envs:
      - key: NODE_ENV
        value: production
      - key: MONGODB_URI
        value: mongodb+srv://username:password@cluster.mongodb.net/tradejournal
        type: SECRET
      - key: JWT_SECRET
        value: your-super-long-random-secret-key
        type: SECRET
```

### 4. AWS EC2 (Advanced)

**Step 1: Launch EC2 instance**

- Ubuntu 20.04 LTS
- t2.micro (free tier eligible)
- Security group: Allow HTTP (80), HTTPS (443), SSH (22)

**Step 2: Connect and setup**

```bash
# Connect to your instance
ssh -i your-key.pem ubuntu@your-instance-ip

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Clone your repository
git clone https://github.com/your-username/your-repo.git
cd your-repo/backend

# Install dependencies
npm install --production

# Create .env file
nano .env
# Add your production environment variables

# Start with PM2
pm2 start server.js --name "tradejournal-api"
pm2 save
pm2 startup
```

**Step 3: Setup Nginx (optional)**

```bash
# Install Nginx
sudo apt install nginx

# Create Nginx config
sudo nano /etc/nginx/sites-available/tradejournal

# Add configuration:
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Enable site
sudo ln -s /etc/nginx/sites-available/tradejournal /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 🗄️ Database Setup

### MongoDB Atlas (Recommended)

**Step 1: Create MongoDB Atlas account**

1. Visit [mongodb.com/cloud/atlas](https://mongodb.com/cloud/atlas)
2. Create free account
3. Create new cluster (free tier: M0)

**Step 2: Configure database**

1. **Database Access**: Create database user

   - Username: `tradejournal-user`
   - Password: Generate secure password
   - Database User Privileges: `Read and write to any database`

2. **Network Access**: Add IP addresses

   - Add `0.0.0.0/0` for all IPs (or specific deployment IPs)

3. **Connect**: Get connection string
   - Choose "Connect your application"
   - Driver: Node.js
   - Copy connection string
   - Replace `<password>` with your database user password

**Step 3: Update environment variable**

```env
MONGODB_URI=mongodb+srv://tradejournal-user:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/tradejournal?retryWrites=true&w=majority
```

## 📧 Email Configuration

### Gmail SMTP

**Step 1: Enable 2-Factor Authentication**

1. Go to Google Account settings
2. Enable 2-Factor Authentication

**Step 2: Generate App Password**

1. Go to Google Account → Security → App passwords
2. Select app: Mail
3. Select device: Other (Custom name)
4. Generate password

**Step 3: Use in environment**

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=generated-app-password
```

### SendGrid (Alternative)

**Step 1: Create SendGrid account**

1. Visit [sendgrid.com](https://sendgrid.com)
2. Create free account (100 emails/day)

**Step 2: Create API key**

1. Go to Settings → API Keys
2. Create API Key with Full Access
3. Copy the API key

**Step 3: Configure environment**

```env
SENDGRID_API_KEY=your-sendgrid-api-key
EMAIL_FROM=your-verified-sender@domain.com
```

## 🔒 Security Checklist

### Environment Variables

- [ ] Change all default passwords and secrets
- [ ] Use strong, random JWT secret (64+ characters)
- [ ] Set NODE_ENV=production
- [ ] Configure proper CORS origins
- [ ] Use HTTPS in production

### MongoDB Security

- [ ] Create dedicated database user (not admin)
- [ ] Use strong password
- [ ] Restrict IP access
- [ ] Enable authentication
- [ ] Regular backups

### Server Security

- [ ] Keep dependencies updated
- [ ] Use HTTPS/SSL certificate
- [ ] Configure firewall
- [ ] Regular security updates
- [ ] Monitor logs

## 📊 Monitoring & Logging

### Application Monitoring

```javascript
// Add to server.js for basic monitoring
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version,
  });
});
```

### Log Management

```javascript
// Add structured logging
const winston = require("winston");

const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: "error.log", level: "error" }),
    new winston.transports.File({ filename: "combined.log" }),
  ],
});

if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.simple(),
    })
  );
}
```

## 🚀 Performance Optimization

### Database Optimization

```javascript
// Add database indexes in your models
UserSchema.index({ email: 1 });
TradeSchema.index({ userId: 1, createdAt: -1 });
TradeSchema.index({ userId: 1, symbol: 1 });
```

### Caching

```javascript
// Add Redis caching for frequent queries
const redis = require("redis");
const client = redis.createClient(process.env.REDIS_URL);

// Cache analytics data
app.get("/api/analytics/dashboard", async (req, res) => {
  const cacheKey = `dashboard:${req.user.id}`;
  const cached = await client.get(cacheKey);

  if (cached) {
    return res.json(JSON.parse(cached));
  }

  // Generate analytics...
  const analytics = await generateDashboardAnalytics(req.user.id);

  // Cache for 5 minutes
  await client.setex(cacheKey, 300, JSON.stringify(analytics));

  res.json(analytics);
});
```

## 🔄 CI/CD Pipeline

### GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v2

      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: "18"

      - name: Install dependencies
        run: |
          cd backend
          npm ci

      - name: Run tests
        run: |
          cd backend
          npm test

      - name: Deploy to Railway
        run: |
          npm install -g @railway/cli
          railway login --browserless
          railway up
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

## 📱 Frontend Integration

### Update Frontend Configuration

```typescript
// In your frontend environment file
const API_BASE_URL =
  process.env.NODE_ENV === "production"
    ? "https://your-api-domain.com/api"
    : "http://localhost:5000/api";

export default {
  API_BASE_URL,
  // ... other config
};
```

## 🔧 Troubleshooting

### Common Issues

**Database Connection**

```bash
# Test MongoDB connection
node -e "
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB error:', err));
"
```

**Email Issues**

```bash
# Test email configuration
node -e "
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransporter({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});
transporter.verify()
  .then(() => console.log('✅ Email config valid'))
  .catch(err => console.error('❌ Email error:', err));
"
```

**Port Issues**

```bash
# Check if port is in use
netstat -tulpn | grep :5000

# Kill process using port
sudo kill -9 $(lsof -t -i:5000)
```

## 📞 Support

For deployment issues:

1. Check server logs: `pm2 logs` or platform-specific logs
2. Verify environment variables are set correctly
3. Test database connectivity
4. Check firewall and security group settings
5. Verify SSL certificate configuration

Remember to replace all placeholder values with your actual configuration!
