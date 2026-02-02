import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, isAdminOrManager } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Barcha yetkazib beruvchilarni olish
router.get('/', authenticate, async (req, res) => {
    try {
        const suppliers = await prisma.supplier.findMany({
            include: { _count: { select: { purchases: true } } },
            orderBy: { name: 'asc' }
        });
        res.json(suppliers);
    } catch (error) {
        res.status(500).json({ error: 'Server xatosi', message: error.message });
    }
});

// Bitta yetkazib beruvchini olish
router.get('/:id', authenticate, async (req, res) => {
    try {
        const supplier = await prisma.supplier.findUnique({
            where: { id: parseInt(req.params.id) },
            include: { purchases: { orderBy: { createdAt: 'desc' }, take: 10 } }
        });

        if (!supplier) {
            return res.status(404).json({ error: 'Yetkazib beruvchi topilmadi' });
        }

        res.json(supplier);
    } catch (error) {
        res.status(500).json({ error: 'Server xatosi', message: error.message });
    }
});

// Yangi yetkazib beruvchi qo'shish
router.post('/', authenticate, isAdminOrManager, async (req, res) => {
    try {
        const { name, phone, email, address } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Yetkazib beruvchi nomi kiritilishi shart' });
        }

        const supplier = await prisma.supplier.create({
            data: { name, phone, email, address }
        });

        res.status(201).json(supplier);
    } catch (error) {
        res.status(500).json({ error: 'Server xatosi', message: error.message });
    }
});

// Yetkazib beruvchini yangilash
router.put('/:id', authenticate, isAdminOrManager, async (req, res) => {
    try {
        const { name, phone, email, address, isActive } = req.body;

        const supplier = await prisma.supplier.update({
            where: { id: parseInt(req.params.id) },
            data: { name, phone, email, address, isActive }
        });

        res.json(supplier);
    } catch (error) {
        res.status(500).json({ error: 'Server xatosi', message: error.message });
    }
});

// Yetkazib beruvchini o'chirish
router.delete('/:id', authenticate, isAdminOrManager, async (req, res) => {
    try {
        await prisma.supplier.update({
            where: { id: parseInt(req.params.id) },
            data: { isActive: false }
        });

        res.json({ message: 'Yetkazib beruvchi o\'chirildi' });
    } catch (error) {
        res.status(500).json({ error: 'Server xatosi', message: error.message });
    }
});

export default router;
