import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// REAL-TIME ANALYTICS DASHBOARD
router.get('/dashboard', authenticate, async (req, res) => {
    try {
        const { branchId } = req.query;

        // Bugungi sana
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Shu oy
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);

        // Joriy filtr
        const whereBase = branchId ? { branchId: parseInt(branchId) } : {};

        // BUGUNGI STATISTIKA
        const todaySales = await prisma.sale.findMany({
            where: {
                ...whereBase,
                createdAt: { gte: today, lt: tomorrow }
            }
        });

        const todayStats = {
            salesCount: todaySales.length,
            revenue: todaySales.reduce((sum, s) => sum + s.totalAmount, 0),
            profit: todaySales.reduce((sum, s) => sum + s.profit, 0),
            cost: todaySales.reduce((sum, s) => sum + s.costTotal, 0)
        };

        // OYLIK STATISTIKA
        const monthSales = await prisma.sale.findMany({
            where: {
                ...whereBase,
                createdAt: { gte: monthStart, lte: monthEnd }
            }
        });

        const monthStats = {
            salesCount: monthSales.length,
            revenue: monthSales.reduce((sum, s) => sum + s.totalAmount, 0),
            profit: monthSales.reduce((sum, s) => sum + s.profit, 0),
            cost: monthSales.reduce((sum, s) => sum + s.costTotal, 0)
        };

        // KASSA BALANSLARI
        const cashRegistersWhere = branchId ? { branchId: parseInt(branchId) } : {};
        const cashRegisters = await prisma.cashRegister.findMany({
            where: { ...cashRegistersWhere, isActive: true },
            include: { branch: true, currency: true }
        });

        const totalCashBalance = cashRegisters.reduce((sum, cr) => sum + cr.balance, 0);

        // KAM QOLGAN MAHSULOTLAR (LOW STOCK ALERTS)
        const warehouses = await prisma.warehouse.findMany({
            where: { isActive: true }
        });

        let lowStockProducts = [];
        for (const warehouse of warehouses) {
            const lowStock = await prisma.productStock.findMany({
                where: {
                    warehouseId: warehouse.id,
                    quantity: { lte: warehouse.lowStockThreshold }
                },
                include: {
                    product: { include: { author: true, category: true } },
                    warehouse: true
                }
            });
            lowStockProducts = [...lowStockProducts, ...lowStock];
        }

        // ENG KO'P SOTILGAN MAHSULOTLAR (BUGUN)
        const todaySaleItems = await prisma.saleItem.findMany({
            where: {
                createdAt: { gte: today, lt: tomorrow }
            },
            include: {
                product: { include: { author: true } }
            }
        });

        const productSales = {};
        todaySaleItems.forEach(item => {
            const pid = item.productId;
            if (!productSales[pid]) {
                productSales[pid] = {
                    product: item.product,
                    quantity: 0,
                    revenue: 0
                };
            }
            productSales[pid].quantity += item.quantity;
            productSales[pid].revenue += item.totalPrice;
        });

        const topProducts = Object.values(productSales)
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 5);

        // SO'NGGI SOTUVLAR
        const recentSales = await prisma.sale.findMany({
            where: whereBase,
            include: {
                user: { select: { fullName: true } },
                paymentType: true,
                currency: true,
                items: { include: { product: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: 10
        });

        // SOTUVLAR TRENDI (OXIRGI 7 KUN)
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);

        const weekSales = await prisma.sale.findMany({
            where: {
                ...whereBase,
                createdAt: { gte: weekAgo }
            },
            orderBy: { createdAt: 'asc' }
        });

        const dailyTrend = {};
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const key = d.toISOString().split('T')[0];
            dailyTrend[key] = { revenue: 0, profit: 0, count: 0 };
        }

        weekSales.forEach(sale => {
            const key = sale.createdAt.toISOString().split('T')[0];
            if (dailyTrend[key]) {
                dailyTrend[key].revenue += sale.totalAmount;
                dailyTrend[key].profit += sale.profit;
                dailyTrend[key].count++;
            }
        });

        // XODIMLAR BO'YICHA SOTUVLAR (BUGUN)
        const salesByUser = {};
        todaySales.forEach(sale => {
            if (!salesByUser[sale.userId]) {
                salesByUser[sale.userId] = { count: 0, revenue: 0 };
            }
            salesByUser[sale.userId].count++;
            salesByUser[sale.userId].revenue += sale.totalAmount;
        });

        const userIds = Object.keys(salesByUser).map(id => parseInt(id));
        const users = await prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, fullName: true }
        });

        const userSalesData = users.map(u => ({
            user: u,
            ...salesByUser[u.id]
        })).sort((a, b) => b.revenue - a.revenue);

        res.json({
            timestamp: new Date().toISOString(),
            today: todayStats,
            month: monthStats,
            cashRegisters: {
                total: totalCashBalance,
                details: cashRegisters.map(cr => ({
                    id: cr.id,
                    name: cr.name,
                    branch: cr.branch?.name,
                    currency: cr.currency.code,
                    balance: cr.balance
                }))
            },
            lowStockAlerts: {
                count: lowStockProducts.length,
                items: lowStockProducts.slice(0, 10)
            },
            topProducts,
            recentSales: recentSales.map(s => ({
                id: s.id,
                amount: s.totalAmount,
                profit: s.profit,
                items: s.items.length,
                user: s.user.fullName,
                paymentType: s.paymentType.nameUz,
                currency: s.currency.code,
                createdAt: s.createdAt
            })),
            trend: Object.entries(dailyTrend).map(([date, data]) => ({
                date,
                ...data
            })),
            salesByUser: userSalesData
        });
    } catch (error) {
        console.error('Analytics error:', error);
        res.status(500).json({ error: 'Server xatosi', message: error.message });
    }
});

// Foyda va zarar hisoboti
router.get('/profit-loss', authenticate, async (req, res) => {
    try {
        const { startDate, endDate, branchId } = req.query;

        const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const end = endDate ? new Date(endDate) : new Date();
        end.setHours(23, 59, 59, 999);

        const where = {
            createdAt: { gte: start, lte: end }
        };
        if (branchId) where.branchId = parseInt(branchId);

        const sales = await prisma.sale.findMany({ where });

        const totalRevenue = sales.reduce((sum, s) => sum + s.totalAmount, 0);
        const totalCost = sales.reduce((sum, s) => sum + s.costTotal, 0);
        const totalProfit = sales.reduce((sum, s) => sum + s.profit, 0);
        const totalDiscount = sales.reduce((sum, s) => sum + s.discount, 0);
        const grossMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(2) : 0;

        // Kunlik breakdown
        const daily = {};
        sales.forEach(sale => {
            const day = sale.createdAt.toISOString().split('T')[0];
            if (!daily[day]) {
                daily[day] = { revenue: 0, cost: 0, profit: 0, count: 0 };
            }
            daily[day].revenue += sale.totalAmount;
            daily[day].cost += sale.costTotal;
            daily[day].profit += sale.profit;
            daily[day].count++;
        });

        res.json({
            period: { start, end },
            summary: {
                totalSales: sales.length,
                totalRevenue,
                totalCost,
                totalProfit,
                totalDiscount,
                grossMargin: `${grossMargin}%`
            },
            daily: Object.entries(daily).map(([date, data]) => ({ date, ...data }))
        });
    } catch (error) {
        res.status(500).json({ error: 'Server xatosi', message: error.message });
    }
});

export default router;
