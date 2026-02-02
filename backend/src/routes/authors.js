import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, isAdminOrManager } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Barcha mualliflarni olish
router.get('/', authenticate, async (req, res) => {
    try {
        const authors = await prisma.author.findMany({
            include: { _count: { select: { products: true } } },
            orderBy: { name: 'asc' }
        });
        res.json(authors);
    } catch (error) {
        res.status(500).json({ error: 'Server xatosi', message: error.message });
    }
});

// Bitta muallifni olish
router.get('/:id', authenticate, async (req, res) => {
    try {
        const author = await prisma.author.findUnique({
            where: { id: parseInt(req.params.id) },
            include: { products: true }
        });

        if (!author) {
            return res.status(404).json({ error: 'Muallif topilmadi' });
        }

        res.json(author);
    } catch (error) {
        res.status(500).json({ error: 'Server xatosi', message: error.message });
    }
});

// Yangi muallif qo'shish
router.post('/', authenticate, isAdminOrManager, async (req, res) => {
    try {
        const { name, bio, country } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Muallif ismi kiritilishi shart' });
        }

        const author = await prisma.author.create({
            data: { name, bio, country }
        });

        res.status(201).json(author);
    } catch (error) {
        res.status(500).json({ error: 'Server xatosi', message: error.message });
    }
});

// Muallifni yangilash
router.put('/:id', authenticate, isAdminOrManager, async (req, res) => {
    try {
        const { name, bio, country, isActive } = req.body;

        const author = await prisma.author.update({
            where: { id: parseInt(req.params.id) },
            data: { name, bio, country, isActive }
        });

        res.json(author);
    } catch (error) {
        res.status(500).json({ error: 'Server xatosi', message: error.message });
    }
});

// Muallifni o'chirish
router.delete('/:id', authenticate, isAdminOrManager, async (req, res) => {
    try {
        await prisma.author.update({
            where: { id: parseInt(req.params.id) },
            data: { isActive: false }
        });

        res.json({ message: 'Muallif o\'chirildi' });
    } catch (error) {
        res.status(500).json({ error: 'Server xatosi', message: error.message });
    }
});

export default router;
