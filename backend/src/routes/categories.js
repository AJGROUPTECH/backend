import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, isAdminOrManager } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Barcha kategoriyalarni olish
router.get('/', authenticate, async (req, res) => {
    try {
        const categories = await prisma.category.findMany({
            include: { _count: { select: { products: true } } },
            orderBy: { name: 'asc' }
        });
        res.json(categories);
    } catch (error) {
        res.status(500).json({ error: 'Server xatosi', message: error.message });
    }
});

// Bitta kategoriyani olish
router.get('/:id', authenticate, async (req, res) => {
    try {
        const category = await prisma.category.findUnique({
            where: { id: parseInt(req.params.id) },
            include: { products: true }
        });

        if (!category) {
            return res.status(404).json({ error: 'Kategoriya topilmadi' });
        }

        res.json(category);
    } catch (error) {
        res.status(500).json({ error: 'Server xatosi', message: error.message });
    }
});

// Yangi kategoriya qo'shish
router.post('/', authenticate, isAdminOrManager, async (req, res) => {
    try {
        const { name, nameUz, icon } = req.body;

        if (!name || !nameUz) {
            return res.status(400).json({ error: 'Kategoriya nomi kiritilishi shart' });
        }

        const category = await prisma.category.create({
            data: { name, nameUz, icon }
        });

        res.status(201).json(category);
    } catch (error) {
        res.status(500).json({ error: 'Server xatosi', message: error.message });
    }
});

// Kategoriyani yangilash
router.put('/:id', authenticate, isAdminOrManager, async (req, res) => {
    try {
        const { name, nameUz, icon, isActive } = req.body;

        const category = await prisma.category.update({
            where: { id: parseInt(req.params.id) },
            data: { name, nameUz, icon, isActive }
        });

        res.json(category);
    } catch (error) {
        res.status(500).json({ error: 'Server xatosi', message: error.message });
    }
});

// Kategoriyani o'chirish
router.delete('/:id', authenticate, isAdminOrManager, async (req, res) => {
    try {
        await prisma.category.update({
            where: { id: parseInt(req.params.id) },
            data: { isActive: false }
        });

        res.json({ message: 'Kategoriya o\'chirildi' });
    } catch (error) {
        res.status(500).json({ error: 'Server xatosi', message: error.message });
    }
});

export default router;
