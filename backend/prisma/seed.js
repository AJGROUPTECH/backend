// Database Seed File - Sample Data
// Ma'lumotlar bazasini namuna ma'lumotlar bilan to'ldirish

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Ma\'lumotlar bazasini to\'ldirish boshlandi...');

    // 1. VALYUTALAR
    console.log('💱 Valyutalar yaratilmoqda...');
    const uzsC = await prisma.currency.upsert({
        where: { code: 'UZS' },
        update: {},
        create: { code: 'UZS', name: 'Uzbek Som', nameUz: 'O\'zbek so\'mi', symbol: 'so\'m', rate: 1, isDefault: true }
    });
    await prisma.currency.upsert({
        where: { code: 'USD' },
        update: {},
        create: { code: 'USD', name: 'US Dollar', nameUz: 'AQSH dollari', symbol: '$', rate: 12500 }
    });
    await prisma.currency.upsert({
        where: { code: 'RUB' },
        update: {},
        create: { code: 'RUB', name: 'Russian Ruble', nameUz: 'Rossiya rubli', symbol: '₽', rate: 140 }
    });

    // 2. TO'LOV TURLARI
    console.log('💳 To\'lov turlari yaratilmoqda...');
    await prisma.paymentType.upsert({
        where: { id: 1 },
        update: {},
        create: { name: 'Cash', nameUz: 'Naqd pul' }
    });
    await prisma.paymentType.upsert({
        where: { id: 2 },
        update: {},
        create: { name: 'Card', nameUz: 'Plastik karta' }
    });
    await prisma.paymentType.upsert({
        where: { id: 3 },
        update: {},
        create: { name: 'Terminal', nameUz: 'Terminal' }
    });

    // 3. FILIAL
    console.log('🏪 Filial yaratilmoqda...');
    const branch = await prisma.branch.upsert({
        where: { id: 1 },
        update: {},
        create: {
            name: 'Asosiy do\'kon',
            address: 'Toshkent shahri, Chilonzor tumani',
            phone: '+998 90 123 45 67'
        }
    });

    // 4. OMBOR
    console.log('📦 Ombor yaratilmoqda...');
    const warehouse = await prisma.warehouse.upsert({
        where: { id: 1 },
        update: {},
        create: {
            name: 'Asosiy ombor',
            branchId: branch.id,
            address: 'Toshkent',
            lowStockThreshold: 5
        }
    });

    // 5. KASSA
    console.log('💰 Kassa yaratilmoqda...');
    await prisma.cashRegister.upsert({
        where: { id: 1 },
        update: {},
        create: {
            name: 'Asosiy kassa',
            branchId: branch.id,
            currencyId: uzsC.id,
            balance: 0
        }
    });

    // 6. ADMIN FOYDALANUVCHI
    console.log('👤 Admin foydalanuvchi yaratilmoqda...');
    const hashedPassword = await bcrypt.hash('Akkkkk&deve$/', 10);
    await prisma.user.upsert({
        where: { username: 'ajdeveloper' },
        update: {},
        create: {
            username: 'ajdeveloper',
            password: hashedPassword,
            fullName: 'Administrator',
            phone: '+998 90 000 00 00',
            role: 'ADMIN',
            branchId: branch.id
        }
    });

    // Kassir ham yaratamiz
    const cashierPassword = await bcrypt.hash('kassir123', 10);
    await prisma.user.upsert({
        where: { username: 'kassir' },
        update: {},
        create: {
            username: 'kassir',
            password: cashierPassword,
            fullName: 'Kassir Alieva',
            phone: '+998 90 111 11 11',
            role: 'CASHIER',
            branchId: branch.id
        }
    });

    // 7. KATEGORIYALAR
    console.log('📁 Kategoriyalar yaratilmoqda...');
    const catFiction = await prisma.category.create({
        data: { name: 'Fiction', nameUz: 'Badiiy adabiyot', icon: '📚' }
    });
    await prisma.category.create({
        data: { name: 'Science', nameUz: 'Ilmiy', icon: '🔬' }
    });
    const catHistory = await prisma.category.create({
        data: { name: 'History', nameUz: 'Tarix', icon: '📜' }
    });
    await prisma.category.create({
        data: { name: 'Children', nameUz: 'Bolalar uchun', icon: '🧒' }
    });
    const catEducation = await prisma.category.create({
        data: { name: 'Education', nameUz: 'Ta\'lim', icon: '🎓' }
    });
    const catPoetry = await prisma.category.create({
        data: { name: 'Poetry', nameUz: 'She\'riyat', icon: '✨' }
    });

    // 8. MUALLIFLAR
    console.log('✍️ Mualliflar yaratilmoqda...');
    const navoiy = await prisma.author.create({
        data: { name: 'Alisher Navoiy', country: 'O\'zbekiston' }
    });
    const qodiriy = await prisma.author.create({
        data: { name: 'Abdulla Qodiriy', country: 'O\'zbekiston' }
    });
    const aytmatov = await prisma.author.create({
        data: { name: 'Chingiz Aytmatov', country: 'Qirg\'iziston' }
    });
    const malik = await prisma.author.create({
        data: { name: 'Tohir Malik', country: 'O\'zbekiston' }
    });
    const hoshimov = await prisma.author.create({
        data: { name: 'O\'tkir Hoshimov', country: 'O\'zbekiston' }
    });
    const olimjon = await prisma.author.create({
        data: { name: 'Hamid Olimjon', country: 'O\'zbekiston' }
    });

    // 9. YETKAZIB BERUVCHILAR
    console.log('🚚 Yetkazib beruvchilar yaratilmoqda...');
    await prisma.supplier.create({
        data: { name: 'Kitob Dunyosi', phone: '+998 71 234 56 78', address: 'Toshkent' }
    });
    await prisma.supplier.create({
        data: { name: 'Sharq Nashriyoti', phone: '+998 71 345 67 89', address: 'Toshkent' }
    });

    // 10. MAHSULOTLAR (KITOBLAR)
    console.log('📖 Kitoblar yaratilmoqda...');
    const books = [
        { name: 'Hamsa', nameUz: 'Xamsa', isbn: '978-9943-00-001-1', barcode: '1234567890001', categoryId: catPoetry.id, authorId: navoiy.id, costPrice: 45000, price: 65000 },
        { name: "O'tkan Kunlar", nameUz: 'O\'tkan kunlar', isbn: '978-9943-00-002-2', barcode: '1234567890002', categoryId: catFiction.id, authorId: qodiriy.id, costPrice: 35000, price: 50000 },
        { name: 'Oq Kema', nameUz: 'Oq kema', isbn: '978-9943-00-003-3', barcode: '1234567890003', categoryId: catFiction.id, authorId: aytmatov.id, costPrice: 40000, price: 55000 },
        { name: 'Shaytanat', nameUz: 'Shaytanat', isbn: '978-9943-00-004-4', barcode: '1234567890004', categoryId: catFiction.id, authorId: malik.id, costPrice: 50000, price: 70000 },
        { name: "Dunyoning Ishlari", nameUz: 'Dunyoning ishlari', isbn: '978-9943-00-005-5', barcode: '1234567890005', categoryId: catFiction.id, authorId: hoshimov.id, costPrice: 38000, price: 52000 },
        { name: 'Zaynabbi Yorim', nameUz: 'Zaynabbi yorim', isbn: '978-9943-00-006-6', barcode: '1234567890006', categoryId: catPoetry.id, authorId: olimjon.id, costPrice: 25000, price: 35000 },
        { name: 'Mehrobdan Chayon', nameUz: 'Mehrobdan chayon', isbn: '978-9943-00-007-7', barcode: '1234567890007', categoryId: catFiction.id, authorId: qodiriy.id, costPrice: 32000, price: 45000 },
        { name: 'Jamila', nameUz: 'Jamila', isbn: '978-9943-00-008-8', barcode: '1234567890008', categoryId: catFiction.id, authorId: aytmatov.id, costPrice: 28000, price: 40000 },
        { name: 'Ikki Eshik Orasi', nameUz: 'Ikki eshik orasi', isbn: '978-9943-00-009-9', barcode: '1234567890009', categoryId: catFiction.id, authorId: malik.id, costPrice: 42000, price: 58000 },
        { name: "Behisht Elchisi", nameUz: 'Behisht Elchisi', isbn: '978-9943-00-010-0', barcode: '1234567890010', categoryId: catFiction.id, authorId: hoshimov.id, costPrice: 36000, price: 48000 },
        { name: 'Boburnoma', nameUz: 'Boburnoma', isbn: '978-9943-00-011-1', barcode: '1234567890011', categoryId: catHistory.id, authorId: navoiy.id, costPrice: 55000, price: 75000 },
        { name: 'Ona Tilim', nameUz: 'Ona tilim', isbn: '978-9943-00-012-2', barcode: '1234567890012', categoryId: catEducation.id, authorId: olimjon.id, costPrice: 20000, price: 30000 }
    ];

    for (const book of books) {
        const product = await prisma.product.create({
            data: {
                name: book.name,
                nameUz: book.nameUz,
                isbn: book.isbn,
                barcode: book.barcode,
                categoryId: book.categoryId,
                authorId: book.authorId,
                costPrice: book.costPrice
            }
        });

        // Narx qo'shish (UZS)
        await prisma.productPrice.create({
            data: {
                productId: product.id,
                currencyId: uzsC.id,
                price: book.price
            }
        });

        // Zaxira qo'shish
        await prisma.productStock.create({
            data: {
                productId: product.id,
                warehouseId: warehouse.id,
                quantity: 500
            }
        });
    }

    console.log('✅ Ma\'lumotlar bazasi muvaffaqiyatli to\'ldirildi!');
    console.log('');
    console.log('📋 Login ma\'lumotlari:');
    console.log('   Admin: username=admin, password=admin123');
    console.log('   Kassir: username=kassir, password=kassir123');
    console.log('');
}

main()
    .catch((e) => {
        console.error('❌ Xatolik:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
