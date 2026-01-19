import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Hash password
  const hashedPassword = await bcrypt.hash('naufalz123', 10);

  // Create admin user
  const adminUser = await prisma.user.upsert({
    where: { username: 'naufal' },
    update: {},
    create: {
      username: 'naufal',
      password: hashedPassword,
      email: 'naufalazca1@gmail.com',
      fullName: 'Naufal Muhammad Azca',
      role: 'ADMIN',
      isActive: true,
    },
  });

  console.log('✅ Admin user created:', {
    id: adminUser.id,
    username: adminUser.username,
    email: adminUser.email,
    role: adminUser.role,
  });

  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
