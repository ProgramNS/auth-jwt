const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create a test user
  const hashedPassword = await bcrypt.hash('password123', 12);
  
  const testUser = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      password: hashedPassword,
      firstName: 'Test',
      lastName: 'User',
      isEmailVerified: true,
      provider: 'local',
    },
  });

  console.log('✅ Created test user:', testUser.email);

  // Create an OAuth test user
  const oauthUser = await prisma.user.upsert({
    where: { email: 'oauth@example.com' },
    update: {},
    create: {
      email: 'oauth@example.com',
      firstName: 'OAuth',
      lastName: 'User',
      isEmailVerified: true,
      provider: 'google',
      providerId: 'google_123456789',
    },
  });

  console.log('✅ Created OAuth user:', oauthUser.email);

  console.log('🎉 Database seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });