import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, isAdmin } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Barcha to'lov turlarini olish
router.get('/', authenticate, async (req, res) => {
    try {
        const paymentTypes = await prisma.paymentType.findMany({
            orderBy: { id: 'asc' }
        });
        res.json(paymentTypes);
    } catch (error) {
        res.status(500).json({ error: 'Server xatosi', message: error.message });
    }
});

// Bitta to'lov turini olish
router.get('/:id', authenticate, async (req, res) => {
    try {
        const paymentType = await prisma.paymentType.findUnique({
            where: { id: parseInt(req.params.id) }
        });

        if (!paymentType) {
            return res.status(404).json({ error: 'To\'lov turi topilmadi' });
        }

        res.json(paymentType);
    } catch (error) {
        res.status(500).json({ error: 'Server xatosi', message: error.message });
    }
});

// Yangi to'lov turi qo'shish
router.post('/', authenticate, isAdmin, async (req, res) => {
    try {
        const { name, nameUz } = req.body;

        if (!name || !nameUz) {
            return res.status(400).json({ error: 'To\'lov turi nomi kiritilishi shart' });
        }

        const paymentType = await prisma.paymentType.create({
            data: { name, nameUz }
        });

        res.status(201).json(paymentType);
    } catch (error) {
        res.status(500).json({ error: 'Server xatosi', message: error.message });
    }
});

// To'lov turini yangilash
router.put('/:id', authenticate, isAdmin, async (req, res) => {
    try {
        const { name, nameUz, isActive } = req.body;

        const paymentType = await prisma.paymentType.update({
            where: { id: parseInt(req.params.id) },
            data: { name, nameUz, isActive }
        });

        res.json(paymentType);
    } catch (error) {
        res.status(500).json({ error: 'Server xatosi', message: error.message });
    }
});

// To'lov turini o'chirish
router.delete('/:id', authenticate, isAdmin, async (req, res) => {
    try {
        await prisma.paymentType.update({
            where: { id: parseInt(req.params.id) },
            data: { isActive: false }
        });

        res.json({ message: 'To\'lov turi o\'chirildi' });
    } catch (error) {
        res.status(500).json({ error: 'Server xatosi', message: error.message });
    }
});

export default router;
