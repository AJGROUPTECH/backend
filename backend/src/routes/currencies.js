import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, isAdmin } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Barcha valyutalarni olish
router.get('/', authenticate, async (req, res) => {
    try {
        const currencies = await prisma.currency.findMany({
            orderBy: { id: 'asc' }
        });
        res.json(currencies);
    } catch (error) {
        res.status(500).json({ error: 'Server xatosi', message: error.message });
    }
});

// Bitta valyutani olish
router.get('/:id', authenticate, async (req, res) => {
    try {
        const currency = await prisma.currency.findUnique({
            where: { id: parseInt(req.params.id) }
        });

        if (!currency) {
            return res.status(404).json({ error: 'Valyuta topilmadi' });
        }

        res.json(currency);
    } catch (error) {
        res.status(500).json({ error: 'Server xatosi', message: error.message });
    }
});

// Yangi valyuta qo'shish
router.post('/', authenticate, isAdmin, async (req, res) => {
    try {
        const { code, name, nameUz, symbol, rate, isDefault } = req.body;

        if (!code || !name || !nameUz || !symbol) {
            return res.status(400).json({ error: 'Barcha maydonlar to\'ldirilishi shart' });
        }

        // Agar yangi valyuta default bo'lsa, boshqalarini o'zgartirish
        if (isDefault) {
            await prisma.currency.updateMany({
                data: { isDefault: false }
            });
        }

        const currency = await prisma.currency.create({
            data: { code, name, nameUz, symbol, rate: rate || 1, isDefault: isDefault || false }
        });

        res.status(201).json(currency);
    } catch (error) {
        res.status(500).json({ error: 'Server xatosi', message: error.message });
    }
});

// Valyutani yangilash
router.put('/:id', authenticate, isAdmin, async (req, res) => {
    try {
        const { code, name, nameUz, symbol, rate, isDefault, isActive } = req.body;

        // Agar yangi valyuta default bo'lsa, boshqalarini o'zgartirish
        if (isDefault) {
            await prisma.currency.updateMany({
                data: { isDefault: false }
            });
        }

        const currency = await prisma.currency.update({
            where: { id: parseInt(req.params.id) },
            data: { code, name, nameUz, symbol, rate, isDefault, isActive }
        });

        res.json(currency);
    } catch (error) {
        res.status(500).json({ error: 'Server xatosi', message: error.message });
    }
});

// Valyutani o'chirish
router.delete('/:id', authenticate, isAdmin, async (req, res) => {
    try {
        await prisma.currency.update({
            where: { id: parseInt(req.params.id) },
            data: { isActive: false }
        });

        res.json({ message: 'Valyuta o\'chirildi' });
    } catch (error) {
        res.status(500).json({ error: 'Server xatosi', message: error.message });
    }
});

export default router;
