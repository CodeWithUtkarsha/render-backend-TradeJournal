# TradeJournal Backend - Quick Start Guide

Follow these steps to get your TradeJournal backend up and running in minutes!

## 🚀 Prerequisites

Before starting, make sure you have:

- ✅ **Node.js** (version 16 or higher) - [Download here](https://nodejs.org/)
- ✅ **MongoDB** - Choose one option:
  - **Option A**: MongoDB Atlas (Cloud) - [Free account](https://mongodb.com/cloud/atlas)
  - **Option B**: Local MongoDB - [Download here](https://mongodb.com/try/download/community)

## 📋 Step-by-Step Setup

### 1. Navigate to Backend Directory

```bash
cd backend
```

### 2. Run Automated Setup

```bash
node setup.js
```

This will:

- ✅ Check Node.js version
- ✅ Install all dependencies
- ✅ Create .env file from template
- ✅ Test MongoDB connection

### 3. Configure Environment Variables

Edit the `.env` file with your settings:

```env
# Required: MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/tradejournal
# OR for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/tradejournal

# Required: JWT Secret (generate a long random string)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Required: Email Configuration (for password reset, notifications)
EMAIL_FROM=your-email@gmail.com
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Optional: Cloudinary (for image uploads)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

### 4. Start the Server

**Development mode** (with auto-restart):

```bash
npm run dev
```

**Production mode**:

```bash
npm start
```

### 5. Verify Installation

Visit: `http://localhost:5000/health`

You should see:

```json
{
  "status": "healthy",
  "message": "TradeJournal Backend API is running",
  "timestamp": "2025-08-14T...",
  "version": "1.0.0"
}
```

## 🔧 Configuration Options

### MongoDB Setup Options

#### Option A: MongoDB Atlas (Recommended for beginners)

1. **Create free account** at [mongodb.com/cloud/atlas](https://mongodb.com/cloud/atlas)
2. **Create a cluster** (free M0 tier available)
3. **Create database user**:
   - Username: `tradejournal-user`
   - Password: Generate secure password
4. **Whitelist IP addresses**:
   - Add `0.0.0.0/0` for all IPs (development)
   - Or add specific IPs for production
5. **Get connection string**:
   - Click "Connect" → "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your database password
6. **Update .env**:
   ```env
   MONGODB_URI=mongodb+srv://tradejournal-user:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/tradejournal
   ```

#### Option B: Local MongoDB

1. **Install MongoDB** from [mongodb.com/try/download/community](https://mongodb.com/try/download/community)
2. **Start MongoDB service**:

   ```bash
   # Windows
   net start MongoDB

   # macOS (with Homebrew)
   brew services start mongodb-community

   # Linux
   sudo systemctl start mongod
   ```

3. **Use default connection**:
   ```env
   MONGODB_URI=mongodb://localhost:27017/tradejournal
   ```

### Email Configuration

#### Gmail Setup (Recommended)

1. **Enable 2-Factor Authentication** on your Google account
2. **Generate App Password**:
   - Go to Google Account → Security → App passwords
   - Select "Mail" and "Other (Custom name)"
   - Copy the generated 16-character password
3. **Update .env**:
   ```env
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=generated-app-password
   ```

#### Other Email Providers

**Outlook/Hotmail**:

```env
EMAIL_HOST=smtp-mail.outlook.com
EMAIL_PORT=587
```

**Yahoo**:

```env
EMAIL_HOST=smtp.mail.yahoo.com
EMAIL_PORT=587
```

### Cloudinary Setup (Optional - for image uploads)

1. **Create free account** at [cloudinary.com](https://cloudinary.com)
2. **Get credentials** from your dashboard
3. **Update .env**:
   ```env
   CLOUDINARY_CLOUD_NAME=your-cloud-name
   CLOUDINARY_API_KEY=your-api-key
   CLOUDINARY_API_SECRET=your-api-secret
   ```

## 🧪 Testing Your Setup

### Test Database Connection

```bash
npm run test
```

### Test API Endpoints

```bash
# Health check
curl http://localhost:5000/health

# Register a user (optional)
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "Test123!@#"
  }'
```

## 📱 Connect to Frontend

### Update Frontend Configuration

In your frontend project, update the API base URL:

```typescript
// In your frontend environment file
const API_BASE_URL = "http://localhost:5000/api";

// Or for production
const API_BASE_URL = "https://your-api-domain.com/api";
```

### Available Endpoints

Once running, your backend provides these main endpoints:

```
Authentication:
POST /api/auth/register        - User registration
POST /api/auth/login          - User login
POST /api/auth/logout         - User logout
POST /api/auth/forgot-password - Request password reset
POST /api/auth/reset-password  - Reset password

User Management:
GET  /api/user/profile        - Get user profile
PUT  /api/user/profile        - Update profile
PUT  /api/user/password       - Change password
POST /api/user/profile-picture - Upload profile picture

Trades:
GET    /api/trades            - Get all trades
GET    /api/trades/:id        - Get specific trade
POST   /api/trades            - Create new trade
PUT    /api/trades/:id        - Update trade
DELETE /api/trades/:id        - Delete trade
POST   /api/trades/import     - Import trades from CSV
GET    /api/trades/export     - Export trades to CSV

Analytics:
GET /api/analytics/dashboard    - Dashboard statistics
GET /api/analytics/performance  - Performance charts
GET /api/analytics/win-loss     - Win/loss analysis
GET /api/analytics/symbols      - Symbol performance
GET /api/analytics/risk         - Risk analysis

File Upload:
POST /api/upload/profile-picture  - Upload profile picture
POST /api/upload/trade-screenshot - Upload trade screenshot
POST /api/upload/csv             - Upload CSV for import
```

## 🚨 Troubleshooting

### Common Issues

#### "Cannot connect to MongoDB"

- **Check if MongoDB is running**: `mongosh --eval "db.adminCommand('ismaster')"`
- **Verify connection string** in .env file
- **Check network connectivity** for Atlas
- **Ensure proper authentication** for Atlas

#### "Port 5000 already in use"

- **Change port** in .env: `PORT=3001`
- **Kill existing process**: `npx kill-port 5000`

#### "JWT_SECRET is required"

- **Generate strong secret**: Use [passwordsgenerator.net](https://passwordsgenerator.net/)
- **Update .env file** with new secret
- **Restart server**

#### "Email sending failed"

- **Check email credentials** in .env
- **Verify app password** for Gmail
- **Test email settings** manually

#### "Module not found"

- **Reinstall dependencies**: `npm install`
- **Clear cache**: `npm cache clean --force`
- **Check Node.js version**: `node --version`

### Log Files

Monitor logs for detailed error information:

```bash
# Development logs
npm run dev

# Check specific errors
tail -f error.log
```

### Support

If you encounter issues:

1. Check the console output for detailed error messages
2. Verify all environment variables are set correctly
3. Test database connectivity separately
4. Review the troubleshooting section in README.md

## 🎉 Success!

If everything is working correctly, you should see:

- ✅ Server running on http://localhost:5000
- ✅ MongoDB connected successfully
- ✅ Health check returns "healthy" status
- ✅ API endpoints responding correctly

Your TradeJournal backend is now ready to handle real user data and provide powerful analytics! 🚀

---

**Next Steps:**

1. Update your frontend to use the backend APIs
2. Configure production deployment (see DEPLOYMENT.md)
3. Set up monitoring and logging for production use
