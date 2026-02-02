import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, isAdminOrManager } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Barcha aylanma mablag'larni olish
router.get('/', authenticate, async (req, res) => {
    try {
        const { cashRegisterId, type } = req.query;

        const where = {};
        if (cashRegisterId) where.cashRegisterId = parseInt(cashRegisterId);
        if (type) where.type = type;

        const funds = await prisma.circulatingFund.findMany({
            where,
            include: { cashRegister: { include: { currency: true } } },
            orderBy: { createdAt: 'desc' }
        });
        res.json(funds);
    } catch (error) {
        res.status(500).json({ error: 'Server xatosi', message: error.message });
    }
});

// Aylanma mablag' kiritish (deposit)
router.post('/deposit', authenticate, isAdminOrManager, async (req, res) => {
    try {
        const { cashRegisterId, amount, depositorName, note } = req.body;

        if (!cashRegisterId || !amount) {
            return res.status(400).json({ error: 'Kassa va miqdor kiritilishi shart' });
        }

        const cashRegister = await prisma.cashRegister.findUnique({
            where: { id: parseInt(cashRegisterId) }
        });

        if (!cashRegister) {
            return res.status(404).json({ error: 'Kassa topilmadi' });
        }

        const depositAmount = parseFloat(amount);
        const newBalance = cashRegister.balance + depositAmount;

        // Kassani yangilash
        await prisma.cashRegister.update({
            where: { id: parseInt(cashRegisterId) },
            data: { balance: newBalance }
        });

        // Aylanma mablag' yozuvini yaratish
        const fund = await prisma.circulatingFund.create({
            data: {
                cashRegisterId: parseInt(cashRegisterId),
                type: 'DEPOSIT',
                amount: depositAmount,
                depositorName,
                note
            },
            include: { cashRegister: { include: { currency: true } } }
        });

        // Moliyaviy harakatni qayd etish
        await prisma.financialMovement.create({
            data: {
                cashRegisterId: parseInt(cashRegisterId),
                currencyId: cashRegister.currencyId,
                userId: req.user.id,
                type: 'INFLOW',
                amount: depositAmount,
                balanceAfter: newBalance,
                referenceType: 'FUND',
                referenceId: fund.id,
                note: note || `Aylanma mablag' kiritish: ${depositorName || 'Noma\'lum'}`
            }
        });

        res.status(201).json({ message: 'Mablag\' muvaffaqiyatli kiritildi', fund });
    } catch (error) {
        res.status(500).json({ error: 'Server xatosi', message: error.message });
    }
});

// Aylanma mablag' chiqarish (withdrawal)
router.post('/withdraw', authenticate, isAdminOrManager, async (req, res) => {
    try {
        const { cashRegisterId, amount, depositorName, note } = req.body;

        if (!cashRegisterId || !amount) {
            return res.status(400).json({ error: 'Kassa va miqdor kiritilishi shart' });
        }

        const cashRegister = await prisma.cashRegister.findUnique({
            where: { id: parseInt(cashRegisterId) }
        });

        if (!cashRegister) {
            return res.status(404).json({ error: 'Kassa topilmadi' });
        }

        const withdrawAmount = parseFloat(amount);

        if (cashRegister.balance < withdrawAmount) {
            return res.status(400).json({ error: 'Kassada yetarli mablag\' yo\'q' });
        }

        const newBalance = cashRegister.balance - withdrawAmount;

        // Kassani yangilash
        await prisma.cashRegister.update({
            where: { id: parseInt(cashRegisterId) },
            data: { balance: newBalance }
        });

        // Aylanma mablag' yozuvini yaratish
        const fund = await prisma.circulatingFund.create({
            data: {
                cashRegisterId: parseInt(cashRegisterId),
                type: 'WITHDRAWAL',
                amount: withdrawAmount,
                depositorName,
                note
            },
            include: { cashRegister: { include: { currency: true } } }
        });

        // Moliyaviy harakatni qayd etish
        await prisma.financialMovement.create({
            data: {
                cashRegisterId: parseInt(cashRegisterId),
                currencyId: cashRegister.currencyId,
                userId: req.user.id,
                type: 'OUTFLOW',
                amount: withdrawAmount,
                balanceAfter: newBalance,
                referenceType: 'FUND',
                referenceId: fund.id,
                note: note || `Aylanma mablag' chiqarish: ${depositorName || 'Noma\'lum'}`
            }
        });

        res.status(201).json({ message: 'Mablag\' muvaffaqiyatli chiqarildi', fund });
    } catch (error) {
        res.status(500).json({ error: 'Server xatosi', message: error.message });
    }
});

export default router;
