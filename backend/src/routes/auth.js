import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Kirish (Login)
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Foydalanuvchi nomi va parol kiritilishi shart' });
        }

        const user = await prisma.user.findUnique({
            where: { username },
            include: { branch: true }
        });

        if (!user) {
            return res.status(401).json({ error: 'Foydalanuvchi topilmadi' });
        }

        if (!user.isActive) {
            return res.status(401).json({ error: 'Foydalanuvchi faol emas' });
        }

        const isValidPassword = await bcrypt.compare(password, user.password);

        if (!isValidPassword) {
            return res.status(401).json({ error: 'Parol noto\'g\'ri' });
        }

        const token = jwt.sign(
            { userId: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        const { password: _, ...userWithoutPassword } = user;

        res.json({
            message: 'Muvaffaqiyatli kirildi',
            token,
            user: userWithoutPassword
        });
    } catch (error) {
        res.status(500).json({ error: 'Server xatosi', message: error.message });
    }
});

// Joriy foydalanuvchi ma'lumotlari
router.get('/me', authenticate, async (req, res) => {
    try {
        const { password: _, ...userWithoutPassword } = req.user;
        res.json(userWithoutPassword);
    } catch (error) {
        res.status(500).json({ error: 'Server xatosi', message: error.message });
    }
});

// Parolni o'zgartirish
router.put('/change-password', authenticate, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Joriy va yangi parol kiritilishi shart' });
        }

        const isValidPassword = await bcrypt.compare(currentPassword, req.user.password);

        if (!isValidPassword) {
            return res.status(401).json({ error: 'Joriy parol noto\'g\'ri' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await prisma.user.update({
            where: { id: req.user.id },
            data: { password: hashedPassword }
        });

        res.json({ message: 'Parol muvaffaqiyatli o\'zgartirildi' });
    } catch (error) {
        res.status(500).json({ error: 'Server xatosi', message: error.message });
    }
});

export default router;
