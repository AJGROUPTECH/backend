import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, isAdminOrManager } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Barcha xaridlarni olish
router.get('/', authenticate, async (req, res) => {
    try {
        const { status, supplierId } = req.query;

        const where = {};
        if (status) where.status = status;
        if (supplierId) where.supplierId = parseInt(supplierId);

        const purchases = await prisma.purchase.findMany({
            where,
            include: {
                supplier: true,
                user: { select: { id: true, fullName: true } },
                currency: true,
                items: {
                    include: { product: true, warehouse: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(purchases);
    } catch (error) {
        res.status(500).json({ error: 'Server xatosi', message: error.message });
    }
});

// Bitta xaridni olish
router.get('/:id', authenticate, async (req, res) => {
    try {
        const purchase = await prisma.purchase.findUnique({
            where: { id: parseInt(req.params.id) },
            include: {
                supplier: true,
                user: { select: { id: true, fullName: true } },
                currency: true,
                items: {
                    include: { product: true, warehouse: true }
                }
            }
        });

        if (!purchase) {
            return res.status(404).json({ error: 'Xarid topilmadi' });
        }

        res.json(purchase);
    } catch (error) {
        res.status(500).json({ error: 'Server xatosi', message: error.message });
    }
});

// Yangi xarid yaratish
router.post('/', authenticate, isAdminOrManager, async (req, res) => {
    try {
        const { supplierId, currencyId, items, note } = req.body;

        if (!supplierId || !currencyId || !items || items.length === 0) {
            return res.status(400).json({ error: 'Yetkazib beruvchi, valyuta va mahsulotlar kiritilishi shart' });
        }

        // Jami summani hisoblash
        let totalAmount = 0;
        for (const item of items) {
            totalAmount += item.quantity * item.unitPrice;
        }

        // Xaridni yaratish
        const purchase = await prisma.purchase.create({
            data: {
                supplierId: parseInt(supplierId),
                userId: req.user.id,
                currencyId: parseInt(currencyId),
                totalAmount,
                status: 'PENDING',
                note
            }
        });

        // Xarid buyumlarini yaratish
        for (const item of items) {
            await prisma.purchaseItem.create({
                data: {
                    purchaseId: purchase.id,
                    productId: parseInt(item.productId),
                    warehouseId: parseInt(item.warehouseId),
                    quantity: parseInt(item.quantity),
                    unitPrice: parseFloat(item.unitPrice),
                    totalPrice: parseInt(item.quantity) * parseFloat(item.unitPrice)
                }
            });
        }

        const fullPurchase = await prisma.purchase.findUnique({
            where: { id: purchase.id },
            include: {
                supplier: true,
                user: { select: { id: true, fullName: true } },
                currency: true,
                items: { include: { product: true, warehouse: true } }
            }
        });

        res.status(201).json(fullPurchase);
    } catch (error) {
        res.status(500).json({ error: 'Server xatosi', message: error.message });
    }
});

// Xaridni qabul qilish (omborga kiritish)
router.post('/:id/receive', authenticate, isAdminOrManager, async (req, res) => {
    try {
        const purchaseId = parseInt(req.params.id);

        const purchase = await prisma.purchase.findUnique({
            where: { id: purchaseId },
            include: { items: { include: { product: true } } }
        });

        if (!purchase) {
            return res.status(404).json({ error: 'Xarid topilmadi' });
        }

        if (purchase.status === 'RECEIVED') {
            return res.status(400).json({ error: 'Bu xarid allaqachon qabul qilingan' });
        }

        if (purchase.status === 'CANCELLED') {
            return res.status(400).json({ error: 'Bekor qilingan xaridni qabul qilish mumkin emas' });
        }

        // Har bir mahsulot uchun zaxirani yangilash
        for (const item of purchase.items) {
            // ProductStock ni topish yoki yaratish
            let stock = await prisma.productStock.findUnique({
                where: {
                    productId_warehouseId: {
                        productId: item.productId,
                        warehouseId: item.warehouseId
                    }
                }
            });

            const newQuantity = (stock?.quantity || 0) + item.quantity;

            if (!stock) {
                stock = await prisma.productStock.create({
                    data: {
                        productId: item.productId,
                        warehouseId: item.warehouseId,
                        quantity: item.quantity
                    }
                });
            } else {
                await prisma.productStock.update({
                    where: { id: stock.id },
                    data: { quantity: newQuantity }
                });
            }

            // Mahsulot sotib olish narxini yangilash
            await prisma.product.update({
                where: { id: item.productId },
                data: { costPrice: item.unitPrice }
            });

            // Mahsulot harakatini qayd etish
            await prisma.productMovement.create({
                data: {
                    productId: item.productId,
                    warehouseId: item.warehouseId,
                    userId: req.user.id,
                    type: 'IN',
                    quantity: item.quantity,
                    quantityAfter: newQuantity,
                    referenceType: 'PURCHASE',
                    referenceId: purchaseId,
                    note: `Xarid #${purchaseId} dan qabul qilindi`
                }
            });
        }

        // Xarid holatini yangilash
        await prisma.purchase.update({
            where: { id: purchaseId },
            data: { status: 'RECEIVED' }
        });

        const updatedPurchase = await prisma.purchase.findUnique({
            where: { id: purchaseId },
            include: {
                supplier: true,
                user: { select: { id: true, fullName: true } },
                currency: true,
                items: { include: { product: true, warehouse: true } }
            }
        });

        res.json({ message: 'Xarid muvaffaqiyatli qabul qilindi', purchase: updatedPurchase });
    } catch (error) {
        res.status(500).json({ error: 'Server xatosi', message: error.message });
    }
});

// Xaridni bekor qilish
router.post('/:id/cancel', authenticate, isAdminOrManager, async (req, res) => {
    try {
        const purchaseId = parseInt(req.params.id);

        const purchase = await prisma.purchase.findUnique({
            where: { id: purchaseId }
        });

        if (!purchase) {
            return res.status(404).json({ error: 'Xarid topilmadi' });
        }

        if (purchase.status === 'RECEIVED') {
            return res.status(400).json({ error: 'Qabul qilingan xaridni bekor qilish mumkin emas' });
        }

        await prisma.purchase.update({
            where: { id: purchaseId },
            data: { status: 'CANCELLED' }
        });

        res.json({ message: 'Xarid bekor qilindi' });
    } catch (error) {
        res.status(500).json({ error: 'Server xatosi', message: error.message });
    }
});

export default router;
