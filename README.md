# Auth & User Management Starter

A comprehensive authentication and user management system built with Node.js, Express, MySQL, and Prisma ORM. Features secure JWT authentication, Google OAuth integration, and comprehensive user management capabilities.

## Features

- 🔐 **JWT Authentication** - Secure access and refresh token implementation
- 🔑 **Google OAuth** - Social login integration with Passport.js
- 👤 **User Management** - Complete CRUD operations for user profiles
- 🛡️ **Security** - Rate limiting, CORS, security headers, and password hashing
- 🗄️ **Database** - MySQL with Prisma ORM for type-safe database operations
- 🧪 **Testing** - Comprehensive unit and integration test suite
- 🐳 **Docker** - Containerized development environment
- 📝 **Code Quality** - ESLint, Prettier, and Husky pre-commit hooks

## Prerequisites

- Node.js v18.x or newer
- npm v9.x or newer
- Docker v20.x or newer
- Docker Compose v2.x or newer

## Quick Start

### Automated Setup (Recommended)

For the fastest setup experience:

```bash
# Clone the repository
git clone <repository-url>
cd auth-user-management-starter

# Automated development setup
npm run setup:dev
```

This single command will:

- Install all dependencies
- Create `.env` file with development defaults
- Start Docker services (MySQL, Adminer)
- Run database migrations and seeding
- Run initial tests to verify setup

### Manual Setup

If you prefer manual setup:

1. **Clone and install dependencies**

   ```bash
   git clone <repository-url>
   cd auth-user-management-starter
   npm install
   ```

2. **Interactive setup**

   ```bash
   npm run setup
   # Follow the interactive prompts for environment selection
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

The API will be available at `http://localhost:3000`
Database admin interface (Adminer) at `http://localhost:8080`

## Available Scripts

### Setup and Development

- `npm run setup` - Interactive project setup for different environments
- `npm run setup:dev` - Automated development environment setup
- `npm run setup:prod` - Production environment setup
- `npm run dev` - Start development server with hot reload
- `npm run dev:debug` - Start development server with debugger

### Production and Deployment

- `npm start` - Start production server
- `npm run start:prod` - Start production server with NODE_ENV=production
- `npm run build` - Build application for production
- `npm run deploy` - Interactive deployment manager
- `npm run health` - Run comprehensive health checks

### Testing

- `npm test` - Run test suite
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report
- `npm run test:unit` - Run unit tests only
- `npm run test:integration` - Run integration tests only
- `npm run test:ci` - Run tests for CI/CD

### Code Quality

- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting

### Database Operations

- `npm run db:migrate` - Run database migrations
- `npm run db:migrate:prod` - Run production database migrations
- `npm run db:generate` - Generate Prisma client
- `npm run db:studio` - Open Prisma Studio
- `npm run db:seed` - Seed database with test data
- `npm run db:reset` - Reset database (careful!)
- `npm run backup:db` - Create database backup
- `npm run restore:db` - Restore database from backup

### Docker Operations

- `npm run docker:up` - Start Docker services
- `npm run docker:down` - Stop Docker services
- `npm run docker:logs` - View Docker container logs
- `npm run docker:clean` - Clean Docker containers and volumes
- `npm run docker:rebuild` - Rebuild and restart Docker containers

## Project Structure

```
├── src/
│   ├── controllers/     # HTTP request handlers
│   ├── services/        # Business logic layer
│   ├── middleware/      # Express middleware
│   ├── routes/          # API route definitions
│   ├── utils/           # Utility functions
│   └── server.js        # Application entry point
├── prisma/
│   ├── schema.prisma    # Database schema
│   └── migrations/      # Database migrations
├── tests/
│   ├── unit/            # Unit tests
│   ├── integration/     # Integration tests
│   └── fixtures/        # Test data
└── docker-compose.yml   # Docker services configuration
```

## API Endpoints

### Authentication

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - User logout
- `GET /api/auth/google` - Google OAuth login
- `GET /api/auth/google/callback` - Google OAuth callback

### User Management

- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `DELETE /api/users/profile` - Delete user account

## Environment Variables

See `.env.example` for all required environment variables and their descriptions.

## Documentation

- **[Development Guide](docs/DEVELOPMENT.md)** - Detailed development setup and workflow
- **[Deployment Guide](docs/DEPLOYMENT.md)** - Production deployment instructions
- **[API Documentation](docs/API.md)** - Complete API reference (if available)
- **[Security Guide](docs/SECURITY.md)** - Security best practices (if available)

## Deployment Options

### Development

```bash
npm run setup:dev  # Automated development setup
npm run dev        # Start development server
```

### Production

```bash
npm run setup:prod  # Production setup
npm run build       # Build for production
npm run deploy      # Interactive deployment
```

### Docker Production

```bash
docker compose -f docker-compose.prod.yml up -d
```

## Monitoring and Maintenance

- **Health Checks**: `npm run health`
- **Database Backups**: `npm run backup:db`
- **Log Monitoring**: Check `logs/` directory
- **Performance**: Built-in health monitoring and metrics

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

MIT License - see LICENSE file for details.
