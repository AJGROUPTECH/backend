// Admin login ma'lumotlarini yangilash skripti
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function updateAdmin() {
    console.log('🔄 Admin ma\'lumotlarini yangilamoqda...');

    const newPassword = await bcrypt.hash('Akkkkk&deve$/', 10);

    // Eski admin ni topish
    const oldAdmin = await prisma.user.findFirst({
        where: { role: 'ADMIN' }
    });

    if (oldAdmin) {
        await prisma.user.update({
            where: { id: oldAdmin.id },
            data: {
                username: 'ajdeveloper',
                password: newPassword
            }
        });
        console.log('✅ Admin yangilandi!');
        console.log('   Login: ajdeveloper');
        console.log('   Parol: Akkkkk&deve$/');
    } else {
        console.log('❌ Admin topilmadi');
    }

    await prisma.$disconnect();
}

updateAdmin().catch(console.error);
