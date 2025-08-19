# Deployment Guide

This guide covers deployment options for the Auth & User Management Starter application.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Development Deployment](#development-deployment)
- [Production Deployment](#production-deployment)
- [Docker Deployment](#docker-deployment)
- [Monitoring and Maintenance](#monitoring-and-maintenance)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements

- **Node.js** v18.x or higher
- **npm** v9.x or higher
- **Docker** v20.x or higher (for containerized deployment)
- **Docker Compose** v2.x or higher
- **MySQL** 8.x (or use Docker)

### Development Tools

- **Git** for version control
- **MySQL client tools** (for database operations)
- **SSL certificates** (for production HTTPS)

## Environment Setup

### 1. Clone and Install

```bash
git clone <repository-url>
cd auth-user-management-starter
npm install
```

### 2. Environment Configuration

Copy the example environment file:

```bash
cp .env.example .env
```

Configure the following variables in `.env`:

```env
# Application
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL=mysql://username:password@localhost:3306/auth_db

# JWT Secrets (generate strong secrets)
JWT_ACCESS_SECRET=your-super-secret-access-key-min-32-chars
JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-32-chars

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=https://yourdomain.com/api/auth/google/callback

# Production Database (for docker-compose.prod.yml)
MYSQL_ROOT_PASSWORD=secure-root-password
MYSQL_DATABASE=auth_db
MYSQL_USER=auth_user
MYSQL_PASSWORD=secure-user-password
MYSQL_PORT=3306

# Redis (optional, for future caching)
REDIS_PASSWORD=secure-redis-password
REDIS_PORT=6379
```

### 3. Generate Secure Secrets

Use the setup script to generate secure secrets:

```bash
npm run setup
```

Or generate manually:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## Development Deployment

### Quick Start

```bash
# Automated development setup
npm run setup:dev
```

### Manual Setup

```bash
# 1. Start database
npm run docker:up

# 2. Run migrations
npm run db:migrate

# 3. Seed database
npm run db:seed

# 4. Start development server
npm run dev
```

### Development Commands

```bash
# Start with debugging
npm run dev:debug

# Run tests
npm run test:watch

# View database
npm run db:studio

# View logs
npm run docker:logs
```

## Production Deployment

### Option 1: Local Production

```bash
# 1. Run production setup
npm run setup:prod

# 2. Build application
npm run build

# 3. Deploy locally
npm run deploy
```

### Option 2: Server Deployment

```bash
# 1. Build deployment package
npm run build
npm run deploy

# 2. Upload to server
scp -r deploy/auth-app-* user@server:/path/to/deployment/

# 3. On server, extract and install
cd /path/to/deployment/auth-app-*
chmod +x scripts/*.sh
./scripts/install.sh

# 4. Configure environment
cp .env.example .env
# Edit .env with production values

# 5. Setup database
npm run db:migrate:prod
npm run db:seed:prod

# 6. Start application
npm run start:prod
```

### Production Environment Variables

Ensure these are properly configured for production:

```env
NODE_ENV=production
DATABASE_URL=mysql://user:pass@prod-db-host:3306/auth_db
JWT_ACCESS_SECRET=<64-char-random-string>
JWT_REFRESH_SECRET=<64-char-random-string>
```

## Docker Deployment

### Development with Docker

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f

# Stop services
docker compose down
```

### Production with Docker

```bash
# 1. Configure production environment
cp .env.example .env
# Edit .env with production values

# 2. Start production stack
docker compose -f docker-compose.prod.yml up -d

# 3. Run database migrations
docker compose -f docker-compose.prod.yml exec app npm run db:migrate:prod

# 4. Seed database (optional)
docker compose -f docker-compose.prod.yml exec app npm run db:seed:prod
```

### Docker Production Stack

The production Docker setup includes:

- **Application**: Node.js app with health checks
- **Database**: MySQL 8.0 with optimized configuration
- **Reverse Proxy**: Nginx with SSL termination and rate limiting
- **Cache**: Redis for session storage (future use)
- **Monitoring**: Health checks and logging

### SSL Configuration

For production, place your SSL certificates in `docker/nginx/ssl/`:

```
docker/nginx/ssl/
├── cert.pem
└── key.pem
```

Or use Let's Encrypt:

```bash
# Install certbot
sudo apt install certbot

# Generate certificates
sudo certbot certonly --standalone -d yourdomain.com

# Copy certificates
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem docker/nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem docker/nginx/ssl/key.pem
```

## Monitoring and Maintenance

### Health Checks

```bash
# Check application health
npm run health

# Check with JSON output
npm run health -- --json

# Docker health check
docker compose ps
```

### Database Maintenance

```bash
# Create backup
npm run backup:db

# Restore from backup
npm run restore:db

# View backup info
ls -la backups/
```

### Log Management

```bash
# View application logs
tail -f logs/development.log

# View Docker logs
docker compose logs -f app

# Rotate logs (production)
logrotate /etc/logrotate.d/auth-app
```

### Updates and Migrations

```bash
# 1. Backup database
npm run backup:db

# 2. Pull latest code
git pull origin main

# 3. Install dependencies
npm ci --only=production

# 4. Run migrations
npm run db:migrate:prod

# 5. Restart application
pm2 restart auth-app
# or
docker compose restart app
```

## Performance Optimization

### Database Optimization

```sql
-- Add indexes for better performance
CREATE INDEX idx_user_email ON User(email);
CREATE INDEX idx_refresh_token_user ON RefreshToken(userId);
CREATE INDEX idx_refresh_token_expires ON RefreshToken(expiresAt);
```

### Application Optimization

```bash
# Enable production optimizations
export NODE_ENV=production

# Use PM2 for process management
npm install -g pm2
pm2 start src/server.js --name auth-app
pm2 startup
pm2 save
```

### Nginx Optimization

The included Nginx configuration provides:

- **Gzip compression** for reduced bandwidth
- **Rate limiting** for DDoS protection
- **SSL termination** with modern ciphers
- **Static file caching** for better performance
- **Health check routing** for load balancers

## Security Considerations

### Production Security Checklist

- [ ] Use strong, unique JWT secrets (64+ characters)
- [ ] Enable HTTPS with valid SSL certificates
- [ ] Configure proper CORS origins
- [ ] Set up rate limiting
- [ ] Use environment variables for secrets
- [ ] Enable database SSL connections
- [ ] Configure firewall rules
- [ ] Set up log monitoring
- [ ] Enable security headers
- [ ] Use non-root user for application

### Database Security

```sql
-- Create dedicated database user
CREATE USER 'auth_app'@'%' IDENTIFIED BY 'strong-password';
GRANT SELECT, INSERT, UPDATE, DELETE ON auth_db.* TO 'auth_app'@'%';
FLUSH PRIVILEGES;
```

### Environment Security

```bash
# Secure file permissions
chmod 600 .env
chmod 700 scripts/
chmod 755 scripts/*.js

# Use secrets management (production)
# - AWS Secrets Manager
# - HashiCorp Vault
# - Kubernetes Secrets
```

## Troubleshooting

### Common Issues

#### Database Connection Failed

```bash
# Check database status
docker compose ps db

# Check database logs
docker compose logs db

# Test connection
mysql -h localhost -u auth_user -p auth_db
```

#### Application Won't Start

```bash
# Check environment variables
npm run health

# Check logs
tail -f logs/development.log

# Verify dependencies
npm audit
```

#### High Memory Usage

```bash
# Check memory usage
npm run health

# Monitor with htop
htop

# Restart application
pm2 restart auth-app
```

#### SSL Certificate Issues

```bash
# Check certificate validity
openssl x509 -in docker/nginx/ssl/cert.pem -text -noout

# Test SSL configuration
openssl s_client -connect yourdomain.com:443
```

### Getting Help

1. Check the [README.md](../README.md) for basic setup
2. Review application logs in `logs/` directory
3. Check Docker container logs: `docker compose logs`
4. Verify environment configuration
5. Test database connectivity
6. Check firewall and network settings

### Support Commands

```bash
# Generate system report
npm run health -- --json > system-report.json

# Create debug package
tar -czf debug-package.tar.gz logs/ .env.example package.json

# Database diagnostics
npm run db:studio
```

## Scaling Considerations

### Horizontal Scaling

- Use load balancer (Nginx, HAProxy, AWS ALB)
- Implement session storage with Redis
- Use database read replicas
- Configure sticky sessions for OAuth flows

### Vertical Scaling

- Increase container memory limits
- Optimize database configuration
- Enable connection pooling
- Use CDN for static assets

### Monitoring

- Set up application monitoring (New Relic, DataDog)
- Configure log aggregation (ELK stack, Splunk)
- Implement health check endpoints
- Set up alerting for critical metrics

---

For more detailed information, see:
- [Development Setup](./DEVELOPMENT.md)
- [API Documentation](./API.md)
- [Security Guide](./SECURITY.md)