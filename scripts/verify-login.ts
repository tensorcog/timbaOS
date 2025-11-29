import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('DATABASE_URL:', process.env.DATABASE_URL);
    const email = 'admin@billssupplies.com';
    const password = 'password';

    console.log(`Verifying login for ${email}...`);

    const user = await prisma.user.findUnique({
        where: { email },
    });

    if (!user) {
        console.error('User not found!');
        const count = await prisma.user.count();
        console.log(`Total users in DB: ${count}`);
        const allUsers = await prisma.user.findMany({ select: { email: true } });
        console.log('Users:', allUsers);
        process.exit(1);
    }

    console.log('User found:', user.id, user.name);
    console.log('Stored hash:', user.password);

    const isValid = await bcrypt.compare(password, user.password);

    if (isValid) {
        console.log('✅ Password is valid!');
    } else {
        console.error('❌ Password is INVALID!');

        // Debug: generate a new hash and compare
        const newHash = await bcrypt.hash(password, 10);
        console.log('New hash would be:', newHash);
        console.log('Compare with new hash:', await bcrypt.compare(password, newHash));
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
