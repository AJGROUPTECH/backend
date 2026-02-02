import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, isAdminOrManager } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Barcha kassalarni olish
router.get('/', authenticate, async (req, res) => {
    try {
        const { branchId } = req.query;

        const where = {};
        if (branchId) where.branchId = parseInt(branchId);

        const cashRegisters = await prisma.cashRegister.findMany({
            where,
            include: { branch: true, currency: true },
            orderBy: { createdAt: 'desc' }
        });
        res.json(cashRegisters);
    } catch (error) {
        res.status(500).json({ error: 'Server xatosi', message: error.message });
    }
});

// Bitta kassani olish
router.get('/:id', authenticate, async (req, res) => {
    try {
        const cashRegister = await prisma.cashRegister.findUnique({
            where: { id: parseInt(req.params.id) },
            include: { branch: true, currency: true }
        });

        if (!cashRegister) {
            return res.status(404).json({ error: 'Kassa topilmadi' });
        }

        res.json(cashRegister);
    } catch (error) {
        res.status(500).json({ error: 'Server xatosi', message: error.message });
    }
});

// Yangi kassa qo'shish
router.post('/', authenticate, isAdminOrManager, async (req, res) => {
    try {
        const { name, branchId, currencyId, balance } = req.body;

        if (!name || !branchId || !currencyId) {
            return res.status(400).json({ error: 'Kassa nomi, filial va valyuta kiritilishi shart' });
        }

        const cashRegister = await prisma.cashRegister.create({
            data: {
                name,
                branchId: parseInt(branchId),
                currencyId: parseInt(currencyId),
                balance: balance ? parseFloat(balance) : 0
            },
            include: { branch: true, currency: true }
        });

        res.status(201).json(cashRegister);
    } catch (error) {
        res.status(500).json({ error: 'Server xatosi', message: error.message });
    }
});

// Kassani yangilash
router.put('/:id', authenticate, isAdminOrManager, async (req, res) => {
    try {
        const { name, branchId, currencyId, isActive } = req.body;

        const cashRegister = await prisma.cashRegister.update({
            where: { id: parseInt(req.params.id) },
            data: {
                name,
                branchId: branchId ? parseInt(branchId) : undefined,
                currencyId: currencyId ? parseInt(currencyId) : undefined,
                isActive
            },
            include: { branch: true, currency: true }
        });

        res.json(cashRegister);
    } catch (error) {
        res.status(500).json({ error: 'Server xatosi', message: error.message });
    }
});

// Kassa balansini qo'lda o'zgartirish
router.post('/:id/adjust-balance', authenticate, isAdminOrManager, async (req, res) => {
    try {
        const { amount, note } = req.body;
        const cashRegisterId = parseInt(req.params.id);

        if (amount === undefined) {
            return res.status(400).json({ error: 'Miqdor kiritilishi shart' });
        }

        const cashRegister = await prisma.cashRegister.findUnique({
            where: { id: cashRegisterId }
        });

        if (!cashRegister) {
            return res.status(404).json({ error: 'Kassa topilmadi' });
        }

        const adjustmentAmount = parseFloat(amount);
        const newBalance = cashRegister.balance + adjustmentAmount;

        // Kassani yangilash
        await prisma.cashRegister.update({
            where: { id: cashRegisterId },
            data: { balance: newBalance }
        });

        // Moliyaviy harakatni qayd etish
        await prisma.financialMovement.create({
            data: {
                cashRegisterId,
                currencyId: cashRegister.currencyId,
                userId: req.user.id,
                type: adjustmentAmount >= 0 ? 'INFLOW' : 'OUTFLOW',
                amount: Math.abs(adjustmentAmount),
                balanceAfter: newBalance,
                referenceType: 'ADJUSTMENT',
                note: note || 'Kassa balansini tuzatish'
            }
        });

        const updatedRegister = await prisma.cashRegister.findUnique({
            where: { id: cashRegisterId },
            include: { branch: true, currency: true }
        });

        res.json({ message: 'Balans muvaffaqiyatli o\'zgartirildi', cashRegister: updatedRegister });
    } catch (error) {
        res.status(500).json({ error: 'Server xatosi', message: error.message });
    }
});

// Kassani o'chirish
router.delete('/:id', authenticate, isAdminOrManager, async (req, res) => {
    try {
        await prisma.cashRegister.update({
            where: { id: parseInt(req.params.id) },
            data: { isActive: false }
        });

        res.json({ message: 'Kassa o\'chirildi' });
    } catch (error) {
        res.status(500).json({ error: 'Server xatosi', message: error.message });
    }
});

export default router;
