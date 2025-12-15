const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const walletAddress = '42YnyzEMjuGkmQCoxS5H9Ez8iSWaZJ825fFofSBb7muf';
  
  // Upsert user - create if not exists, update if exists
  const user = await prisma.user.upsert({
    where: { walletAddress },
    update: { role: 'BANK_ADMIN' },
    create: {
      walletAddress,
      email: 'admin@rwatest.com',
      role: 'BANK_ADMIN',
      kycStatus: 'VERIFIED'
    }
  });
  console.log('User set up with role:', user.role, 'ID:', user.id);
  
  // Create a bank for this user
  const existingBank = await prisma.bank.findFirst({
    where: { adminUserId: user.id }
  });
  
  if (existingBank) {
    console.log('Bank already exists:', existingBank.name);
  } else {
    const bank = await prisma.bank.create({
      data: {
        name: 'RWA Test Bank',
        adminUserId: user.id,
        registrationNumber: 'REG-001',
        jurisdiction: 'US'
      }
    });
    console.log('Created bank:', bank.name, bank.id);
  }
  
  await prisma.$disconnect();
}

main()
  .then(() => process.exit(0))
  .catch(e => { console.error(e); process.exit(1); });
