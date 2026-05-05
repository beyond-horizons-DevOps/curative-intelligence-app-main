const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verify() {
  console.log('--- Social Media Connection Report ---');
  
  const accounts = await prisma.socialMediaAccount.findMany({
    include: {
      user: {
        select: { email: true }
      }
    }
  });

  if (accounts.length === 0) {
    console.log('No accounts linked yet. Try logging in with Google or Facebook!');
  } else {
    accounts.forEach(acc => {
      console.log(`\n[${acc.platform}]`);
      console.log(`User: ${acc.user.email}`);
      console.log(`Platform Username: ${acc.username || 'N/A'}`);
      console.log(`Linked At: ${acc.createdAt}`);
      console.log(`Token Status: ${acc.accessToken ? '✅ Encrypted & Stored' : '❌ Missing'}`);
      console.log(`Refresh Token: ${acc.refreshToken ? '✅ Available' : '❌ None'}`);
    });
  }
  
  await prisma.$disconnect();
}

verify().catch(e => {
  console.error(e);
  process.exit(1);
});
