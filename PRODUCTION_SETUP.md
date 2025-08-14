# 🚨 PRODUCTION DEPLOYMENT GUIDE

## Critical Issues Fixed

### 1. ✅ Socket.IO URL Hardcoding
**Fixed**: Socket.IO now uses environment variable or dynamic URL
**Set**: `NEXT_PUBLIC_SOCKET_URL=https://yourdomain.com`

### 2. ✅ CORS Security
**Fixed**: CORS now restricts origins in production
**Set**: `CLIENT_URL=https://yourdomain.com`

### 3. ✅ Dynamic Port Binding
**Fixed**: Server now uses `PORT` environment variable
**Set**: `PORT=8080` (or let cloud platform set it)

## Required Environment Variables

```bash
# REQUIRED for production
NODE_ENV=production
NEXT_PUBLIC_BASE_URL=https://yourdomain.com
NEXTAUTH_URL=https://yourdomain.com
CLIENT_URL=https://yourdomain.com
NEXT_PUBLIC_SOCKET_URL=https://yourdomain.com

# Authentication
NEXTAUTH_SECRET=your-super-secret-key-here

# Database
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/database

# OAuth Providers
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
LINKEDIN_CLIENT_ID=your-linkedin-client-id
LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret

# External Services
OPENAI_API_KEY=your-openai-api-key
RESEND_API_KEY=your-resend-api-key

# Security
CRON_SECRET=your-cron-secret-key
```

## Remaining Issues to Address

### 1. 🔴 Console Logs
**Problem**: Many console.log/error statements in production
**Solution**: Replace with proper logging service (Winston, Pino)

### 2. 🔴 Error Boundaries
**Problem**: No React error boundaries
**Solution**: Add error boundaries to main components

### 3. 🔴 Rate Limiting
**Problem**: No API rate limiting
**Solution**: Add rate limiting middleware

### 4. 🔴 Input Validation
**Problem**: Limited input sanitization
**Solution**: Add comprehensive validation

### 5. 🔴 Health Checks
**Problem**: No health check endpoints
**Solution**: Add `/api/health` endpoint

## Google Cloud Deployment

### Cloud Run
```bash
# Build and deploy
docker build -t gcr.io/PROJECT_ID/kavisha-ai .
docker push gcr.io/PROJECT_ID/kavisha-ai

# Deploy with environment variables
gcloud run deploy kavisha-ai \
  --image gcr.io/PROJECT_ID/kavisha-ai \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production,CLIENT_URL=https://yourdomain.com
```

### GKE
```yaml
env:
- name: NODE_ENV
  value: "production"
- name: CLIENT_URL
  value: "https://yourdomain.com"
- name: NEXT_PUBLIC_SOCKET_URL
  value: "https://yourdomain.com"
```

## Security Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Configure proper CORS origins
- [ ] Use HTTPS URLs only
- [ ] Set strong secrets
- [ ] Enable rate limiting
- [ ] Add input validation
- [ ] Configure proper logging
- [ ] Set up monitoring
- [ ] Enable error tracking
- [ ] Configure backup strategy
