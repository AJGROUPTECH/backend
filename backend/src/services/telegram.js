// Telegram Bot Service
// Telegram bot xizmati - xabarlar yuborish

import TelegramBot from 'node-telegram-bot-api';
import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

let bot = null;
let chatIds = new Set(); // Obunachi chat ID lar

// Bot ishga tushirish
export function initTelegramBot() {
    const token = process.env.TELEGRAM_BOT_TOKEN;

    if (!token) {
        console.log('⚠️ TELEGRAM_BOT_TOKEN topilmadi. Telegram bot ishlamaydi.');
        return null;
    }

    try {
        bot = new TelegramBot(token, { polling: true });
        console.log('🤖 Telegram bot ishga tushdi!');

        // /start buyrug'i - obuna bo'lish
        bot.onText(/\/start/, (msg) => {
            const chatId = msg.chat.id;
            chatIds.add(chatId);
            saveChatId(chatId);

            bot.sendMessage(chatId,
                `🎉 *Xush kelibsiz Kutubxona ERP botiga!*\n\n` +
                `Siz endi quyidagi xabarlarni olasiz:\n` +
                `📦 Sotuv xabarlari\n` +
                `⚠️ Kam zaxira ogohlantirishlari\n` +
                `📊 Kunlik hisobotlar\n\n` +
                `Buyruqlar:\n` +
                `/stats - Bugungi statistika\n` +
                `/stock - Kam zaxira ro'yxati\n` +
                `/stop - Obunani bekor qilish`,
                { parse_mode: 'Markdown' }
            );
        });

        // /stop buyrug'i - obunadan chiqish
        bot.onText(/\/stop/, (msg) => {
            const chatId = msg.chat.id;
            chatIds.delete(chatId);
            removeChatId(chatId);

            bot.sendMessage(chatId,
                `👋 Obuna bekor qilindi.\n` +
                `Qaytish uchun /start bosing.`
            );
        });

        // /stats buyrug'i - bugungi statistika
        bot.onText(/\/stats/, async (msg) => {
            const chatId = msg.chat.id;
            const stats = await getTodayStats();

            bot.sendMessage(chatId,
                `📊 *Bugungi statistika*\n\n` +
                `💰 Jami sotuv: ${stats.totalSales} ta\n` +
                `💵 Daromad: ${formatMoney(stats.revenue)}\n` +
                `📈 Foyda: ${formatMoney(stats.profit)}\n` +
                `📦 Sotilgan kitoblar: ${stats.itemsSold} ta`,
                { parse_mode: 'Markdown' }
            );
        });

        // /stock buyrug'i - kam zaxira
        bot.onText(/\/stock/, async (msg) => {
            const chatId = msg.chat.id;
            const lowStock = await getLowStockItems();

            if (lowStock.length === 0) {
                bot.sendMessage(chatId, '✅ Barcha mahsulotlar zaxirasi yetarli!');
                return;
            }

            let message = `⚠️ *Kam zaxira mahsulotlar (${lowStock.length} ta):*\n\n`;
            lowStock.slice(0, 10).forEach((item, i) => {
                message += `${i + 1}. ${item.product.nameUz} - ${item.quantity} ta qoldi\n`;
            });

            if (lowStock.length > 10) {
                message += `\n... va yana ${lowStock.length - 10} ta`;
            }

            bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
        });

        // Kunlik hisobot - har kuni 20:00 da
        cron.schedule('0 20 * * *', async () => {
            await sendDailyReport();
        }, {
            timezone: 'Asia/Tashkent'
        });

        // Obunachi ID larni yuklash
        loadChatIds();

        return bot;
    } catch (error) {
        console.error('❌ Telegram bot xatosi:', error.message);
        return null;
    }
}

// Sotuv xabari yuborish
export async function sendSaleNotification(sale) {
    if (!bot || chatIds.size === 0) return;

    const items = sale.items?.map(item =>
        `  • ${item.product?.nameUz || 'Mahsulot'} x${item.quantity}`
    ).join('\n') || '';

    const message =
        `🛒 *Yangi sotuv!*\n\n` +
        `🆔 Sotuv #${sale.id}\n` +
        `👤 Kassir: ${sale.user?.fullName || 'Noma\'lum'}\n` +
        `💳 To'lov: ${sale.paymentType?.nameUz || 'Noma\'lum'}\n\n` +
        `📦 *Mahsulotlar:*\n${items}\n\n` +
        `💰 *Jami:* ${formatMoney(sale.totalAmount)}\n` +
        `📈 *Foyda:* ${formatMoney(sale.profit)}`;

    await broadcastMessage(message);
}

// Kam zaxira ogohlantirish
export async function sendLowStockAlert(product, quantity, warehouseName) {
    if (!bot || chatIds.size === 0) return;

    const emoji = quantity <= 2 ? '🔴' : '🟡';

    const message =
        `${emoji} *Kam zaxira ogohlantirish!*\n\n` +
        `📚 *${product.nameUz}*\n` +
        `📦 Ombor: ${warehouseName}\n` +
        `⚠️ Qolgan: *${quantity} ta*\n\n` +
        `Iltimos, zaxirani to'ldiring!`;

    await broadcastMessage(message);
}

// Kunlik hisobot yuborish
export async function sendDailyReport() {
    if (!bot || chatIds.size === 0) return;

    const stats = await getDailyReportStats();

    const message =
        `📊 *Kunlik hisobot*\n` +
        `📅 ${formatDate(new Date())}\n\n` +
        `━━━━━━━━━━━━━━━\n` +
        `💰 *Sotuvlar:* ${stats.totalSales} ta\n` +
        `💵 *Daromad:* ${formatMoney(stats.revenue)}\n` +
        `📈 *Foyda:* ${formatMoney(stats.profit)}\n` +
        `📦 *Sotilgan kitoblar:* ${stats.itemsSold} ta\n` +
        `━━━━━━━━━━━━━━━\n\n` +
        `🏆 *Eng ko'p sotilgan:*\n${stats.topProducts}\n\n` +
        `⚠️ *Kam zaxira:* ${stats.lowStockCount} ta mahsulot`;

    await broadcastMessage(message);
}

// Barcha obunachilarga xabar yuborish
async function broadcastMessage(message) {
    for (const chatId of chatIds) {
        try {
            await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
        } catch (error) {
            if (error.response?.statusCode === 403) {
                // Foydalanuvchi botni bloklagan
                chatIds.delete(chatId);
                removeChatId(chatId);
            }
        }
    }
}

// Bugungi statistika olish
async function getTodayStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sales = await prisma.sale.findMany({
        where: {
            createdAt: { gte: today }
        },
        include: {
            items: true
        }
    });

    return {
        totalSales: sales.length,
        revenue: sales.reduce((sum, s) => sum + s.totalAmount, 0),
        profit: sales.reduce((sum, s) => sum + s.profit, 0),
        itemsSold: sales.reduce((sum, s) => sum + s.items.reduce((i, item) => i + item.quantity, 0), 0)
    };
}

// Kunlik hisobot statistikasi
async function getDailyReportStats() {
    const stats = await getTodayStats();

    // Eng ko'p sotilgan mahsulotlar
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const topItems = await prisma.saleItem.groupBy({
        by: ['productId'],
        where: {
            createdAt: { gte: today }
        },
        _sum: {
            quantity: true
        },
        orderBy: {
            _sum: {
                quantity: 'desc'
            }
        },
        take: 3
    });

    let topProducts = '';
    for (const item of topItems) {
        const product = await prisma.product.findUnique({
            where: { id: item.productId }
        });
        if (product) {
            topProducts += `  • ${product.nameUz} (${item._sum.quantity} ta)\n`;
        }
    }

    if (!topProducts) {
        topProducts = '  Bugun sotuv yo\'q';
    }

    // Kam zaxira soni
    const lowStockCount = await prisma.productStock.count({
        where: {
            quantity: { lte: 5 }
        }
    });

    return {
        ...stats,
        topProducts,
        lowStockCount
    };
}

// Kam zaxira mahsulotlar
async function getLowStockItems() {
    return await prisma.productStock.findMany({
        where: {
            quantity: { lte: 5 }
        },
        include: {
            product: true,
            warehouse: true
        },
        orderBy: {
            quantity: 'asc'
        }
    });
}

// Chat ID larni saqlash (oddiy fayl orqali)
function saveChatId(chatId) {
    // Environment variable orqali yoki bazaga saqlash mumkin
    // Hozircha Set da saqlaymiz
    console.log(`📱 Yangi obunachi: ${chatId}`);
}

function removeChatId(chatId) {
    console.log(`📱 Obunachi chiqdi: ${chatId}`);
}

function loadChatIds() {
    // Agar TELEGRAM_CHAT_IDS environment variable bor bo'lsa
    const savedIds = process.env.TELEGRAM_CHAT_IDS;
    if (savedIds) {
        savedIds.split(',').forEach(id => {
            const numId = parseInt(id.trim());
            if (!isNaN(numId)) {
                chatIds.add(numId);
            }
        });
    }
}

// Pul formatini chiroyli ko'rsatish
function formatMoney(amount) {
    return new Intl.NumberFormat('uz-UZ').format(amount) + ' so\'m';
}

// Sana formatini chiroyli ko'rsatish
function formatDate(date) {
    return date.toLocaleDateString('uz-UZ', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

export { bot, chatIds };
