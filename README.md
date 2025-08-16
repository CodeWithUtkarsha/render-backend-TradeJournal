# TradeJournal Backend API

Complete MongoDB backend for the TradeJournal application with authentication, trade management, analytics, and file uploads.

## 🚀 Quick Start

### Prerequisites

- Node.js (v18 or higher)
- MongoDB (local or Atlas)
- npm or yarn

### Installation

1. **Navigate to backend directory:**

```bash
cd backend
```

2. **Install dependencies:**

```bash
npm install
```

3. **Set up environment variables:**

```bash
cp .env.example .env
```

4. **Edit `.env` file with your configuration:**

```env
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/tradejournal

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=30d

# Email Configuration
EMAIL_FROM=your-email@gmail.com
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Frontend URL
FRONTEND_URL=http://localhost:5173
```

5. **Start the server:**

```bash
# Development mode
npm run dev

# Production mode
npm start
```

## 📊 Database Schema

### User Model

- **Authentication**: Email, password (bcrypt hashed), 2FA support
- **Profile**: Name, bio, profile picture, trading preferences
- **Settings**: Notifications, risk parameters, subscription
- **Security**: Login attempts, account locking, password reset

### Trade Model

- **Basic Info**: Symbol, type (Long/Short), entry/exit prices, quantity
- **Risk Management**: Stop loss, take profit, risk percentage
- **Performance**: P&L calculation, commission, fees
- **Psychology**: Mood, confidence ratings
- **Analysis**: Strategy, setup, timeframe, market conditions
- **Media**: Screenshots and attachments

## 🔐 Authentication & Security

### Features

- **JWT Authentication** with access and refresh tokens
- **Password Security** with bcrypt hashing (12 rounds)
- **2FA Support** with TOTP and backup codes
- **Account Protection** with login attempt limiting
- **Email Verification** for new accounts
- **Password Reset** with secure tokens
- **Rate Limiting** to prevent abuse

### Endpoints

```
POST /api/auth/register      - User registration
POST /api/auth/login         - User login
POST /api/auth/logout        - User logout
POST /api/auth/forgot-password - Request password reset
POST /api/auth/reset-password  - Reset password with token
POST /api/auth/2fa/setup     - Setup 2FA
POST /api/auth/2fa/verify    - Verify and enable 2FA
```

## 📈 Trade Management

### Features

- **CRUD Operations** for all trades
- **Automatic P&L Calculation** based on entry/exit prices
- **Risk Management** tracking with stop loss and take profit
- **Performance Metrics** calculation
- **Bulk Import/Export** for trade data
- **Advanced Filtering** and sorting

### Endpoints

```
GET    /api/trades           - Get all trades (with filters)
GET    /api/trades/:id       - Get specific trade
POST   /api/trades           - Create new trade
PUT    /api/trades/:id       - Update trade
DELETE /api/trades/:id       - Delete trade
POST   /api/trades/import    - Bulk import trades
GET    /api/trades/export    - Export trades
```

## 📊 Analytics & Reporting

### Features

- **Dashboard Statistics** with real-time metrics
- **Performance Charts** with time-based filtering
- **Win/Loss Analysis** with detailed breakdowns
- **Symbol Performance** tracking
- **Risk Analysis** and drawdown calculations
- **Time-based Analytics** for trading patterns

### Endpoints

```
GET /api/analytics/dashboard    - Dashboard stats
GET /api/analytics/performance  - Performance chart data
GET /api/analytics/win-loss     - Win/loss analysis
GET /api/analytics/symbols      - Symbol performance
GET /api/analytics/risk         - Risk analysis
```

## 👤 User Management

### Features

- **Profile Management** with complete user data
- **Settings Updates** for preferences and notifications
- **Password Changes** with current password verification
- **Profile Picture Upload** with Cloudinary integration
- **Account Deletion** with data cleanup

### Endpoints

```
GET    /api/user/profile         - Get user profile
PUT    /api/user/profile         - Update profile
PUT    /api/user/password        - Change password
POST   /api/user/profile-picture - Upload profile picture
DELETE /api/user/profile-picture - Delete profile picture
```

## 📁 File Upload

### Features

- **Image Upload** to Cloudinary
- **File Validation** (type and size limits)
- **Secure URLs** with automatic optimization
- **File Deletion** and cleanup

### Endpoints

```
POST   /api/upload/image    - Upload image
DELETE /api/upload/image    - Delete image
```

## 🔧 Configuration

### Environment Variables

#### Required

```env
MONGODB_URI=mongodb://localhost:27017/tradejournal
JWT_SECRET=your-jwt-secret
EMAIL_FROM=your-email@domain.com
EMAIL_HOST=smtp.gmail.com
EMAIL_USER=your-email@domain.com
EMAIL_PASS=your-email-password
```

#### Optional

```env
NODE_ENV=development
PORT=5000
JWT_EXPIRE=30d
BCRYPT_SALT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
FRONTEND_URL=http://localhost:5173
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

## 🚀 Deployment

### Development

```bash
npm run dev
```

### Production

```bash
npm start
```

### Docker (Optional)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

## 📝 API Response Format

### Success Response

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    // Response data
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": "Error message",
  "errors": [
    // Validation errors (if any)
  ]
}
```

## 🔍 Error Handling

### HTTP Status Codes

- **200** - Success
- **201** - Created
- **400** - Bad Request (validation errors)
- **401** - Unauthorized
- **403** - Forbidden
- **404** - Not Found
- **423** - Locked (account locked)
- **429** - Too Many Requests
- **500** - Internal Server Error

### Error Types

- **Validation Errors** - Input validation failures
- **Authentication Errors** - Invalid credentials or tokens
- **Authorization Errors** - Insufficient permissions
- **Database Errors** - MongoDB connection or query issues
- **File Upload Errors** - File size or type restrictions

## 🧪 Testing

### Health Check

```bash
curl http://localhost:5000/health
```

### API Documentation

The API includes comprehensive error handling and validation. Each endpoint returns detailed error messages for debugging.

## 🔒 Security Features

### Password Security

- Minimum 8 characters
- Must include uppercase, lowercase, number, and special character
- Bcrypt hashing with 12 salt rounds
- Password history prevention

### Account Protection

- Maximum 5 failed login attempts
- Account lockout for 2 hours after failed attempts
- Email notifications for security events

### Data Protection

- Input validation and sanitization
- SQL injection prevention
- XSS protection with helmet.js
- Rate limiting for API endpoints

## 📱 Integration with Frontend

### Authentication Flow

1. User registers/logs in
2. Backend returns JWT token
3. Frontend stores token in localStorage
4. Token included in Authorization header for API calls
5. Backend validates token on protected routes

### Real-time Updates

The backend is designed to work seamlessly with the existing frontend, providing:

- Consistent data structure
- Real-time analytics calculations
- Secure file upload handling
- Email notifications

## 🐛 Troubleshooting

### Common Issues

#### MongoDB Connection

```bash
# Check if MongoDB is running
mongosh --eval "db.adminCommand('ismaster')"

# Check connection string
echo $MONGODB_URI
```

#### Email Configuration

```bash
# Test email settings
node -e "console.log(process.env.EMAIL_HOST, process.env.EMAIL_USER)"
```

#### JWT Issues

```bash
# Verify JWT secret is set
echo $JWT_SECRET
```

## 📚 Additional Resources

- [MongoDB Documentation](https://docs.mongodb.com/)
- [Express.js Guide](https://expressjs.com/)
- [JWT.io](https://jwt.io/)
- [Cloudinary Documentation](https://cloudinary.com/documentation)

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

🚀 **Your TradeJournal backend is now ready for production!**
