import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Foydalanuvchini tekshirish middleware
export const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Token topilmadi' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            include: { branch: true }
        });

        if (!user || !user.isActive) {
            return res.status(401).json({ error: 'Foydalanuvchi topilmadi yoki faol emas' });
        }

        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token muddati tugagan' });
        }
        return res.status(401).json({ error: 'Noto\'g\'ri token' });
    }
};

// Rol tekshirish middleware
export const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                error: 'Sizda bu amalni bajarish uchun ruxsat yo\'q'
            });
        }
        next();
    };
};

// ADMIN yoki MANAGER bo'lishi kerak
export const isAdminOrManager = authorize('ADMIN', 'MANAGER');

// Faqat ADMIN bo'lishi kerak
export const isAdmin = authorize('ADMIN');
