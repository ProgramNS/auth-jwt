# Database Setup

This directory contains the Prisma configuration and database migrations for the Auth & User Management system.

## Files

- `schema.prisma` - Main Prisma schema defining the database models
- `seed.js` - Database seeding script with initial test data
- `migrations/` - Database migration files

## Database Models

### User
- Supports both local authentication (email/password) and OAuth (Google)
- Stores user profile information and authentication metadata
- Tracks email verification status and last login time

### RefreshToken
- Manages JWT refresh tokens for secure authentication
- Supports token revocation and expiration
- Automatically cleaned up when user is deleted (CASCADE)

## Setup Instructions

1. **Start the database:**
   ```bash
   docker compose up -d db adminer
   ```

2. **Run migrations:**
   ```bash
   npm run db:migrate
   ```

3. **Seed the database (optional):**
   ```bash
   npm run db:seed
   ```

4. **Access database admin (optional):**
   - Open http://localhost:8080 in your browser
   - Server: `db`
   - Username: `auth_user`
   - Password: `auth_password`
   - Database: `auth_db`

## Available Scripts

- `npm run db:migrate` - Run database migrations
- `npm run db:generate` - Generate Prisma client
- `npm run db:studio` - Open Prisma Studio
- `npm run db:seed` - Seed database with test data

## Environment Variables

Make sure your `.env` file contains:

```env
DATABASE_URL="mysql://auth_user:auth_password@localhost:3306/auth_db"
```