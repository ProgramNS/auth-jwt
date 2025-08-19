# Development Setup Guide

This guide helps you set up the development environment for the Auth & User Management Starter.

## Quick Start

```bash
# Clone the repository
git clone <repository-url>
cd auth-user-management-starter

# Automated development setup
npm run setup:dev
```

This will:
- Install dependencies
- Create `.env` file with development defaults
- Start Docker services (MySQL, Adminer)
- Run database migrations
- Seed the database with test data
- Run initial tests

## Manual Setup

If you prefer to set up manually or need to troubleshoot:

### 1. Prerequisites

Ensure you have installed:
- Node.js v18.x or higher
- npm v9.x or higher
- Docker and Docker Compose
- Git

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

```bash
cp .env.example .env
```

The development `.env` file should contain:

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=mysql://auth_user:auth_password@localhost:3306/auth_db
JWT_ACCESS_SECRET=dev-access-secret-key-min-32-characters
JWT_REFRESH_SECRET=dev-refresh-secret-key-min-32-characters
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback
```

### 4. Start Database Services

```bash
# Start MySQL and Adminer
npm run docker:up

# Check services are running
docker compose ps
```

### 5. Database Setup

```bash
# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# Seed with test data
npm run db:seed
```

### 6. Start Development Server

```bash
npm run dev
```

The application will be available at:
- **API**: http://localhost:3000
- **Database Admin**: http://localhost:8080 (Adminer)

## Development Workflow

### Daily Development

```bash
# Start development server with auto-reload
npm run dev

# Run tests in watch mode
npm run test:watch

# Run specific test suites
npm run test:unit
npm run test:integration

# Check code quality
npm run lint
npm run format
```

### Database Operations

```bash
# View database in browser
npm run db:studio

# Reset database (careful!)
npm run db:reset

# Create new migration
npx prisma migrate dev --name your-migration-name

# View database directly
mysql -h localhost -u auth_user -p auth_db
```

### Docker Operations

```bash
# Start all services
npm run docker:up

# Stop all services
npm run docker:down

# View logs
npm run docker:logs

# Clean up (removes volumes)
npm run docker:clean

# Rebuild containers
npm run docker:rebuild
```

## Project Structure

```
auth-user-management-starter/
├── src/                    # Application source code
│   ├── controllers/        # HTTP request handlers
│   ├── services/          # Business logic
│   ├── repositories/      # Data access layer
│   ├── middleware/        # Express middleware
│   ├── routes/           # API route definitions
│   ├── config/           # Configuration files
│   └── utils/            # Utility functions
├── tests/                # Test files
│   ├── unit/             # Unit tests
│   ├── integration/      # Integration tests
│   ├── fixtures/         # Test data
│   └── utils/            # Test utilities
├── prisma/               # Database schema and migrations
├── scripts/              # Development and deployment scripts
├── docker/               # Docker configuration files
├── docs/                 # Documentation
└── logs/                 # Application logs
```

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test types
npm run test:unit
npm run test:integration

# Run tests in watch mode
npm run test:watch
npm run test:unit:watch
npm run test:integration:watch

# Debug tests
npm run test:debug
```

### Writing Tests

#### Unit Tests

```javascript
// tests/unit/services/authService.test.js
const { AuthService } = require('../../../src/services/authService');

describe('AuthService', () => {
  describe('register', () => {
    it('should create a new user', async () => {
      // Test implementation
    });
  });
});
```

#### Integration Tests

```javascript
// tests/integration/auth.test.js
const request = require('supertest');
const app = require('../../src/app');

describe('POST /api/auth/register', () => {
  it('should register a new user', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User'
      });

    expect(response.status).toBe(201);
  });
});
```

### Test Database

Tests use a separate test database. The test setup:

1. Creates a clean test database
2. Runs migrations
3. Seeds with test data
4. Cleans up after tests

## Code Quality

### Linting and Formatting

```bash
# Check code style
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format

# Check formatting
npm run format:check
```

### Pre-commit Hooks

Husky is configured to run checks before commits:

- ESLint for code quality
- Prettier for code formatting
- Tests for functionality

### Code Style Guidelines

- Use ES6+ features
- Follow ESLint configuration
- Write descriptive variable names
- Add JSDoc comments for functions
- Keep functions small and focused
- Use async/await over Promises

## Debugging

### Application Debugging

```bash
# Start with debugger
npm run dev:debug

# Debug tests
npm run test:debug
```

Then attach your debugger to `localhost:9229`.

### Database Debugging

```bash
# Open Prisma Studio
npm run db:studio

# View raw SQL queries
# Add to your code:
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});
```

### Docker Debugging

```bash
# View container logs
docker compose logs app
docker compose logs db

# Execute commands in containers
docker compose exec app bash
docker compose exec db mysql -u root -p

# Inspect container
docker inspect auth_mysql
```

## Environment Variables

### Development Variables

```env
# Application
NODE_ENV=development
PORT=3000
HOST=localhost

# Database
DATABASE_URL=mysql://auth_user:auth_password@localhost:3306/auth_db

# JWT Configuration
JWT_ACCESS_SECRET=development-access-secret-min-32-chars
JWT_REFRESH_SECRET=development-refresh-secret-min-32-chars
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback

# Logging
LOG_LEVEL=debug
LOG_FILE=logs/development.log

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Getting Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:3000/api/auth/google/callback`
6. Copy Client ID and Client Secret to `.env`

## Common Development Tasks

### Adding New API Endpoints

1. **Create route handler**:
   ```javascript
   // src/routes/userRoutes.js
   router.get('/profile', authMiddleware, userController.getProfile);
   ```

2. **Implement controller**:
   ```javascript
   // src/controllers/userController.js
   async getProfile(req, res, next) {
     try {
       const user = await userService.getUserById(req.user.id);
       res.json({ success: true, data: user });
     } catch (error) {
       next(error);
     }
   }
   ```

3. **Add service logic**:
   ```javascript
   // src/services/userService.js
   async getUserById(id) {
     return await userRepository.findById(id);
   }
   ```

4. **Write tests**:
   ```javascript
   // tests/integration/users.test.js
   describe('GET /api/users/profile', () => {
     it('should return user profile', async () => {
       // Test implementation
     });
   });
   ```

### Database Schema Changes

1. **Modify Prisma schema**:
   ```prisma
   // prisma/schema.prisma
   model User {
     id        String   @id @default(cuid())
     email     String   @unique
     // Add new field
     phone     String?
   }
   ```

2. **Create migration**:
   ```bash
   npx prisma migrate dev --name add-user-phone
   ```

3. **Update seed data**:
   ```javascript
   // prisma/seed.js
   await prisma.user.create({
     data: {
       email: 'test@example.com',
       phone: '+1234567890', // Add new field
     }
   });
   ```

### Adding Middleware

1. **Create middleware**:
   ```javascript
   // src/middleware/customMiddleware.js
   module.exports = (req, res, next) => {
     // Middleware logic
     next();
   };
   ```

2. **Register middleware**:
   ```javascript
   // src/app.js
   const customMiddleware = require('./middleware/customMiddleware');
   app.use('/api', customMiddleware);
   ```

3. **Test middleware**:
   ```javascript
   // tests/unit/middleware/customMiddleware.test.js
   describe('customMiddleware', () => {
     it('should process requests correctly', () => {
       // Test implementation
     });
   });
   ```

## Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>
```

#### Database Connection Issues
```bash
# Check Docker containers
docker compose ps

# Restart database
docker compose restart db

# Check database logs
docker compose logs db
```

#### Permission Issues
```bash
# Fix file permissions
chmod +x scripts/*.js

# Fix npm permissions
sudo chown -R $(whoami) ~/.npm
```

#### Node Modules Issues
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

### Getting Help

1. Check the logs in `logs/development.log`
2. Run health check: `npm run health`
3. Check Docker container status: `docker compose ps`
4. Review environment variables in `.env`
5. Run tests to identify issues: `npm test`

## Performance Tips

### Development Performance

- Use `npm run dev` for auto-reload
- Run specific test suites instead of all tests
- Use `npm run db:studio` instead of command-line MySQL
- Keep Docker containers running between sessions

### Database Performance

- Use database indexes for frequently queried fields
- Limit query results with `take` and `skip`
- Use database transactions for multiple operations
- Monitor slow queries in development

### Code Performance

- Use async/await consistently
- Implement proper error handling
- Cache frequently accessed data
- Use connection pooling for database

---

For more information, see:
- [Deployment Guide](./DEPLOYMENT.md)
- [API Documentation](./API.md)
- [Contributing Guidelines](./CONTRIBUTING.md)