import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, isAdminOrManager } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Barcha filiallarni olish
router.get('/', authenticate, async (req, res) => {
    try {
        const branches = await prisma.branch.findMany({
            include: {
                _count: {
                    select: { users: true, warehouses: true, cashRegisters: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(branches);
    } catch (error) {
        res.status(500).json({ error: 'Server xatosi', message: error.message });
    }
});

// Bitta filialni olish
router.get('/:id', authenticate, async (req, res) => {
    try {
        const branch = await prisma.branch.findUnique({
            where: { id: parseInt(req.params.id) },
            include: {
                users: { select: { id: true, fullName: true, role: true } },
                warehouses: true,
                cashRegisters: { include: { currency: true } }
            }
        });

        if (!branch) {
            return res.status(404).json({ error: 'Filial topilmadi' });
        }

        res.json(branch);
    } catch (error) {
        res.status(500).json({ error: 'Server xatosi', message: error.message });
    }
});

// Yangi filial qo'shish
router.post('/', authenticate, isAdminOrManager, async (req, res) => {
    try {
        const { name, address, phone } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Filial nomi kiritilishi shart' });
        }

        const branch = await prisma.branch.create({
            data: { name, address, phone }
        });

        res.status(201).json(branch);
    } catch (error) {
        res.status(500).json({ error: 'Server xatosi', message: error.message });
    }
});

// Filialni yangilash
router.put('/:id', authenticate, isAdminOrManager, async (req, res) => {
    try {
        const { name, address, phone, isActive } = req.body;

        const branch = await prisma.branch.update({
            where: { id: parseInt(req.params.id) },
            data: { name, address, phone, isActive }
        });

        res.json(branch);
    } catch (error) {
        res.status(500).json({ error: 'Server xatosi', message: error.message });
    }
});

// Filialni o'chirish
router.delete('/:id', authenticate, isAdminOrManager, async (req, res) => {
    try {
        await prisma.branch.update({
            where: { id: parseInt(req.params.id) },
            data: { isActive: false }
        });

        res.json({ message: 'Filial o\'chirildi' });
    } catch (error) {
        res.status(500).json({ error: 'Server xatosi', message: error.message });
    }
});

export default router;
