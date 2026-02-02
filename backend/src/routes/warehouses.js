import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, isAdminOrManager } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Barcha omborlarni olish
router.get('/', authenticate, async (req, res) => {
    try {
        const warehouses = await prisma.warehouse.findMany({
            include: {
                branch: true,
                _count: { select: { productStocks: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(warehouses);
    } catch (error) {
        res.status(500).json({ error: 'Server xatosi', message: error.message });
    }
});

// Bitta omborni olish
router.get('/:id', authenticate, async (req, res) => {
    try {
        const warehouse = await prisma.warehouse.findUnique({
            where: { id: parseInt(req.params.id) },
            include: {
                branch: true,
                productStocks: {
                    include: { product: { include: { category: true, author: true } } }
                }
            }
        });

        if (!warehouse) {
            return res.status(404).json({ error: 'Ombor topilmadi' });
        }

        res.json(warehouse);
    } catch (error) {
        res.status(500).json({ error: 'Server xatosi', message: error.message });
    }
});

// Yangi ombor qo'shish
router.post('/', authenticate, isAdminOrManager, async (req, res) => {
    try {
        const { name, branchId, address, lowStockThreshold } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Ombor nomi kiritilishi shart' });
        }

        const warehouse = await prisma.warehouse.create({
            data: {
                name,
                branchId: branchId ? parseInt(branchId) : null,
                address,
                lowStockThreshold: lowStockThreshold || 5
            },
            include: { branch: true }
        });

        res.status(201).json(warehouse);
    } catch (error) {
        res.status(500).json({ error: 'Server xatosi', message: error.message });
    }
});

// Omborni yangilash
router.put('/:id', authenticate, isAdminOrManager, async (req, res) => {
    try {
        const { name, branchId, address, lowStockThreshold, isActive } = req.body;

        const warehouse = await prisma.warehouse.update({
            where: { id: parseInt(req.params.id) },
            data: {
                name,
                branchId: branchId ? parseInt(branchId) : null,
                address,
                lowStockThreshold,
                isActive
            },
            include: { branch: true }
        });

        res.json(warehouse);
    } catch (error) {
        res.status(500).json({ error: 'Server xatosi', message: error.message });
    }
});

// Omborni o'chirish
router.delete('/:id', authenticate, isAdminOrManager, async (req, res) => {
    try {
        await prisma.warehouse.update({
            where: { id: parseInt(req.params.id) },
            data: { isActive: false }
        });

        res.json({ message: 'Ombor o\'chirildi' });
    } catch (error) {
        res.status(500).json({ error: 'Server xatosi', message: error.message });
    }
});

// Kam qolgan mahsulotlarni olish (low stock alerts)
router.get('/:id/low-stock', authenticate, async (req, res) => {
    try {
        const warehouseId = parseInt(req.params.id);

        const warehouse = await prisma.warehouse.findUnique({
            where: { id: warehouseId }
        });

        if (!warehouse) {
            return res.status(404).json({ error: 'Ombor topilmadi' });
        }

        const lowStockProducts = await prisma.productStock.findMany({
            where: {
                warehouseId,
                quantity: { lte: warehouse.lowStockThreshold }
            },
            include: {
                product: { include: { category: true, author: true } }
            },
            orderBy: { quantity: 'asc' }
        });

        res.json(lowStockProducts);
    } catch (error) {
        res.status(500).json({ error: 'Server xatosi', message: error.message });
    }
});

export default router;
