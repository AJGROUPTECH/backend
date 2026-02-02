import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, isAdminOrManager } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Barcha pul o'tkazmalarini olish
router.get('/', authenticate, async (req, res) => {
    try {
        const transfers = await prisma.moneyTransfer.findMany({
            include: {
                fromRegister: { include: { branch: true, currency: true } },
                toRegister: { include: { branch: true, currency: true } },
                user: { select: { id: true, fullName: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(transfers);
    } catch (error) {
        res.status(500).json({ error: 'Server xatosi', message: error.message });
    }
});

// Pul o'tkazish
router.post('/', authenticate, isAdminOrManager, async (req, res) => {
    try {
        const { fromRegisterId, toRegisterId, amount, note } = req.body;

        if (!fromRegisterId || !toRegisterId || !amount) {
            return res.status(400).json({ error: 'Kassalar va miqdor kiritilishi shart' });
        }

        if (fromRegisterId === toRegisterId) {
            return res.status(400).json({ error: 'Bir xil kassaga pul o\'tkazish mumkin emas' });
        }

        const fromRegister = await prisma.cashRegister.findUnique({
            where: { id: parseInt(fromRegisterId) }
        });

        const toRegister = await prisma.cashRegister.findUnique({
            where: { id: parseInt(toRegisterId) }
        });

        if (!fromRegister || !toRegister) {
            return res.status(404).json({ error: 'Kassa topilmadi' });
        }

        const transferAmount = parseFloat(amount);

        if (fromRegister.balance < transferAmount) {
            return res.status(400).json({ error: 'Kassada yetarli mablag\' yo\'q' });
        }

        const fromNewBalance = fromRegister.balance - transferAmount;
        const toNewBalance = toRegister.balance + transferAmount;

        // Kassalarni yangilash
        await prisma.cashRegister.update({
            where: { id: parseInt(fromRegisterId) },
            data: { balance: fromNewBalance }
        });

        await prisma.cashRegister.update({
            where: { id: parseInt(toRegisterId) },
            data: { balance: toNewBalance }
        });

        // O'tkazma yozuvini yaratish
        const transfer = await prisma.moneyTransfer.create({
            data: {
                fromRegisterId: parseInt(fromRegisterId),
                toRegisterId: parseInt(toRegisterId),
                userId: req.user.id,
                amount: transferAmount,
                note
            },
            include: {
                fromRegister: { include: { branch: true, currency: true } },
                toRegister: { include: { branch: true, currency: true } },
                user: { select: { id: true, fullName: true } }
            }
        });

        // Moliyaviy harakatlarni qayd etish
        await prisma.financialMovement.create({
            data: {
                cashRegisterId: parseInt(fromRegisterId),
                currencyId: fromRegister.currencyId,
                userId: req.user.id,
                type: 'OUTFLOW',
                amount: transferAmount,
                balanceAfter: fromNewBalance,
                referenceType: 'TRANSFER',
                referenceId: transfer.id,
                note: note || `Pul o'tkazish`
            }
        });

        await prisma.financialMovement.create({
            data: {
                cashRegisterId: parseInt(toRegisterId),
                currencyId: toRegister.currencyId,
                userId: req.user.id,
                type: 'INFLOW',
                amount: transferAmount,
                balanceAfter: toNewBalance,
                referenceType: 'TRANSFER',
                referenceId: transfer.id,
                note: note || `Pul qabul qilish`
            }
        });

        res.status(201).json({ message: 'Pul muvaffaqiyatli o\'tkazildi', transfer });
    } catch (error) {
        res.status(500).json({ error: 'Server xatosi', message: error.message });
    }
});

export default router;
