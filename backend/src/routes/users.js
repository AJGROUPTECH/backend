import express from 'express';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { authenticate, isAdmin } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Barcha foydalanuvchilarni olish
router.get('/', authenticate, isAdmin, async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            include: { branch: true },
            orderBy: { createdAt: 'desc' }
        });

        const usersWithoutPasswords = users.map(({ password, ...user }) => user);
        res.json(usersWithoutPasswords);
    } catch (error) {
        res.status(500).json({ error: 'Server xatosi', message: error.message });
    }
});

// Bitta foydalanuvchini olish
router.get('/:id', authenticate, isAdmin, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: parseInt(req.params.id) },
            include: { branch: true }
        });

        if (!user) {
            return res.status(404).json({ error: 'Foydalanuvchi topilmadi' });
        }

        const { password, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
    } catch (error) {
        res.status(500).json({ error: 'Server xatosi', message: error.message });
    }
});

// Yangi foydalanuvchi qo'shish
router.post('/', authenticate, isAdmin, async (req, res) => {
    try {
        const { username, password, fullName, phone, email, role, branchId } = req.body;

        if (!username || !password || !fullName) {
            return res.status(400).json({ error: 'Foydalanuvchi nomi, parol va to\'liq ism kiritilishi shart' });
        }

        const existingUser = await prisma.user.findUnique({ where: { username } });

        if (existingUser) {
            return res.status(400).json({ error: 'Bu foydalanuvchi nomi allaqachon mavjud' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                username,
                password: hashedPassword,
                fullName,
                phone,
                email,
                role: role || 'CASHIER',
                branchId: branchId ? parseInt(branchId) : null
            },
            include: { branch: true }
        });

        const { password: _, ...userWithoutPassword } = user;
        res.status(201).json(userWithoutPassword);
    } catch (error) {
        res.status(500).json({ error: 'Server xatosi', message: error.message });
    }
});

// Foydalanuvchini yangilash
router.put('/:id', authenticate, isAdmin, async (req, res) => {
    try {
        const { fullName, phone, email, role, branchId, isActive, password } = req.body;

        const updateData = {
            fullName,
            phone,
            email,
            role,
            branchId: branchId ? parseInt(branchId) : null,
            isActive
        };

        if (password) {
            updateData.password = await bcrypt.hash(password, 10);
        }

        const user = await prisma.user.update({
            where: { id: parseInt(req.params.id) },
            data: updateData,
            include: { branch: true }
        });

        const { password: _, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
    } catch (error) {
        res.status(500).json({ error: 'Server xatosi', message: error.message });
    }
});

// Foydalanuvchini o'chirish
router.delete('/:id', authenticate, isAdmin, async (req, res) => {
    try {
        const userId = parseInt(req.params.id);

        if (userId === req.user.id) {
            return res.status(400).json({ error: 'O\'zingizni o\'chira olmaysiz' });
        }

        await prisma.user.update({
            where: { id: userId },
            data: { isActive: false }
        });

        res.json({ message: 'Foydalanuvchi o\'chirildi' });
    } catch (error) {
        res.status(500).json({ error: 'Server xatosi', message: error.message });
    }
});

export default router;
