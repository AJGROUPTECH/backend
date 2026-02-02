import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Oylik sotuvlar hisoboti
router.get('/sales/monthly', authenticate, async (req, res) => {
    try {
        const { year, month, branchId } = req.query;

        const startDate = new Date(year || new Date().getFullYear(), (month || new Date().getMonth() + 1) - 1, 1);
        const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0, 23, 59, 59);

        const where = {
            createdAt: { gte: startDate, lte: endDate }
        };
        if (branchId) where.branchId = parseInt(branchId);

        const sales = await prisma.sale.findMany({
            where,
            include: {
                branch: true,
                user: { select: { id: true, fullName: true } },
                currency: true,
                paymentType: true,
                items: { include: { product: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Statistikani hisoblash
        const totalSales = sales.length;
        const totalRevenue = sales.reduce((sum, s) => sum + s.totalAmount, 0);
        const totalProfit = sales.reduce((sum, s) => sum + s.profit, 0);
        const totalCost = sales.reduce((sum, s) => sum + s.costTotal, 0);
        const totalDiscount = sales.reduce((sum, s) => sum + s.discount, 0);

        // To'lov turlari bo'yicha
        const byPaymentType = {};
        sales.forEach(sale => {
            const typeName = sale.paymentType.nameUz;
            if (!byPaymentType[typeName]) {
                byPaymentType[typeName] = { count: 0, amount: 0 };
            }
            byPaymentType[typeName].count++;
            byPaymentType[typeName].amount += sale.totalAmount;
        });

        // Kunlik sotuvlar
        const dailySales = {};
        sales.forEach(sale => {
            const day = sale.createdAt.toISOString().split('T')[0];
            if (!dailySales[day]) {
                dailySales[day] = { count: 0, revenue: 0, profit: 0 };
            }
            dailySales[day].count++;
            dailySales[day].revenue += sale.totalAmount;
            dailySales[day].profit += sale.profit;
        });

        res.json({
            period: { year: startDate.getFullYear(), month: startDate.getMonth() + 1 },
            summary: {
                totalSales,
                totalRevenue,
                totalProfit,
                totalCost,
                totalDiscount,
                profitMargin: totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(2) : 0
            },
            byPaymentType,
            dailySales,
            sales
        });
    } catch (error) {
        res.status(500).json({ error: 'Server xatosi', message: error.message });
    }
});

// Inventar hisoboti
router.get('/inventory', authenticate, async (req, res) => {
    try {
        const { warehouseId, lowStockOnly } = req.query;

        const where = {};
        if (warehouseId) where.warehouseId = parseInt(warehouseId);

        const stocks = await prisma.productStock.findMany({
            where,
            include: {
                product: { include: { category: true, author: true, prices: { include: { currency: true } } } },
                warehouse: true
            },
            orderBy: { quantity: 'asc' }
        });

        // Kam qolgan mahsulotlarni filtrlash
        let filteredStocks = stocks;
        if (lowStockOnly === 'true') {
            const warehouses = await prisma.warehouse.findMany();
            const thresholds = {};
            warehouses.forEach(w => thresholds[w.id] = w.lowStockThreshold);

            filteredStocks = stocks.filter(s => s.quantity <= (thresholds[s.warehouseId] || 5));
        }

        // Umumiy statistika
        const totalProducts = filteredStocks.length;
        const totalQuantity = filteredStocks.reduce((sum, s) => sum + s.quantity, 0);
        const outOfStock = filteredStocks.filter(s => s.quantity === 0).length;
        const lowStock = filteredStocks.filter(s => s.quantity > 0 && s.quantity <= 5).length;

        res.json({
            summary: {
                totalProducts,
                totalQuantity,
                outOfStock,
                lowStock
            },
            stocks: filteredStocks
        });
    } catch (error) {
        res.status(500).json({ error: 'Server xatosi', message: error.message });
    }
});

// Moliyaviy hisobot
router.get('/financial', authenticate, async (req, res) => {
    try {
        const { startDate, endDate, cashRegisterId } = req.query;

        const where = {};

        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) where.createdAt.gte = new Date(startDate);
            if (endDate) where.createdAt.lte = new Date(endDate);
        }

        if (cashRegisterId) where.cashRegisterId = parseInt(cashRegisterId);

        const movements = await prisma.financialMovement.findMany({
            where,
            include: {
                cashRegister: { include: { branch: true } },
                currency: true,
                paymentType: true,
                user: { select: { id: true, fullName: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Hisoblash
        const totalInflow = movements.filter(m => m.type === 'INFLOW').reduce((sum, m) => sum + m.amount, 0);
        const totalOutflow = movements.filter(m => m.type === 'OUTFLOW').reduce((sum, m) => sum + m.amount, 0);
        const netFlow = totalInflow - totalOutflow;

        // Manba bo'yicha
        const byReferenceType = {};
        movements.forEach(m => {
            const type = m.referenceType || 'OTHER';
            if (!byReferenceType[type]) {
                byReferenceType[type] = { inflow: 0, outflow: 0, count: 0 };
            }
            if (m.type === 'INFLOW') {
                byReferenceType[type].inflow += m.amount;
            } else {
                byReferenceType[type].outflow += m.amount;
            }
            byReferenceType[type].count++;
        });

        // Kassalar balansi
        const cashRegisters = await prisma.cashRegister.findMany({
            include: { branch: true, currency: true }
        });

        res.json({
            summary: {
                totalInflow,
                totalOutflow,
                netFlow,
                movementCount: movements.length
            },
            byReferenceType,
            cashRegisterBalances: cashRegisters.map(cr => ({
                id: cr.id,
                name: cr.name,
                branch: cr.branch?.name,
                currency: cr.currency.code,
                balance: cr.balance
            })),
            movements
        });
    } catch (error) {
        res.status(500).json({ error: 'Server xatosi', message: error.message });
    }
});

// Mahsulotlar harakati hisoboti
router.get('/product-movements', authenticate, async (req, res) => {
    try {
        const { productId, warehouseId, type, startDate, endDate } = req.query;

        const where = {};
        if (productId) where.productId = parseInt(productId);
        if (warehouseId) where.warehouseId = parseInt(warehouseId);
        if (type) where.type = type;

        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) where.createdAt.gte = new Date(startDate);
            if (endDate) where.createdAt.lte = new Date(endDate);
        }

        const movements = await prisma.productMovement.findMany({
            where,
            include: {
                product: true,
                warehouse: true,
                user: { select: { id: true, fullName: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Statistika
        const totalIn = movements.filter(m => m.type === 'IN').reduce((sum, m) => sum + m.quantity, 0);
        const totalOut = movements.filter(m => m.type === 'OUT').reduce((sum, m) => sum + Math.abs(m.quantity), 0);
        const adjustments = movements.filter(m => m.type === 'ADJUSTMENT').length;

        res.json({
            summary: {
                totalIn,
                totalOut,
                adjustments,
                movementCount: movements.length
            },
            movements
        });
    } catch (error) {
        res.status(500).json({ error: 'Server xatosi', message: error.message });
    }
});

// Eng ko'p sotilgan mahsulotlar
router.get('/top-products', authenticate, async (req, res) => {
    try {
        const { limit, startDate, endDate } = req.query;

        const where = {};
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) where.createdAt.gte = new Date(startDate);
            if (endDate) where.createdAt.lte = new Date(endDate);
        }

        const saleItems = await prisma.saleItem.findMany({
            where,
            include: {
                product: { include: { author: true, category: true } }
            }
        });

        // Mahsulotlar bo'yicha guruhlash
        const productStats = {};
        saleItems.forEach(item => {
            const pid = item.productId;
            if (!productStats[pid]) {
                productStats[pid] = {
                    product: item.product,
                    totalQuantity: 0,
                    totalRevenue: 0,
                    totalProfit: 0
                };
            }
            productStats[pid].totalQuantity += item.quantity;
            productStats[pid].totalRevenue += item.totalPrice;
            productStats[pid].totalProfit += item.profit;
        });

        const sorted = Object.values(productStats)
            .sort((a, b) => b.totalQuantity - a.totalQuantity)
            .slice(0, parseInt(limit) || 10);

        res.json(sorted);
    } catch (error) {
        res.status(500).json({ error: 'Server xatosi', message: error.message });
    }
});

export default router;
