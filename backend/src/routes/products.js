import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, isAdminOrManager } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();
const prisma = new PrismaClient();

// Barcha mahsulotlarni olish
router.get('/', authenticate, async (req, res) => {
    try {
        const { search, categoryId, authorId, warehouseId } = req.query;

        const where = { isActive: true };

        if (search) {
            where.OR = [
                { name: { contains: search } },
                { nameUz: { contains: search } },
                { isbn: { contains: search } },
                { barcode: { contains: search } }
            ];
        }

        if (categoryId) where.categoryId = parseInt(categoryId);
        if (authorId) where.authorId = parseInt(authorId);

        const products = await prisma.product.findMany({
            where,
            include: {
                category: true,
                author: true,
                prices: { include: { currency: true } },
                stocks: { include: { warehouse: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(products);
    } catch (error) {
        res.status(500).json({ error: 'Server xatosi', message: error.message });
    }
});

// Shtrix-kod bo'yicha mahsulot qidirish (POS uchun)
router.get('/barcode/:barcode', authenticate, async (req, res) => {
    try {
        const product = await prisma.product.findFirst({
            where: {
                OR: [
                    { barcode: req.params.barcode },
                    { isbn: req.params.barcode }
                ],
                isActive: true
            },
            include: {
                category: true,
                author: true,
                prices: { include: { currency: true } },
                stocks: { include: { warehouse: true } }
            }
        });

        if (!product) {
            return res.status(404).json({ error: 'Mahsulot topilmadi' });
        }

        res.json(product);
    } catch (error) {
        res.status(500).json({ error: 'Server xatosi', message: error.message });
    }
});

// Bitta mahsulotni olish
router.get('/:id', authenticate, async (req, res) => {
    try {
        const product = await prisma.product.findUnique({
            where: { id: parseInt(req.params.id) },
            include: {
                category: true,
                author: true,
                prices: { include: { currency: true } },
                stocks: { include: { warehouse: true } }
            }
        });

        if (!product) {
            return res.status(404).json({ error: 'Mahsulot topilmadi' });
        }

        res.json(product);
    } catch (error) {
        res.status(500).json({ error: 'Server xatosi', message: error.message });
    }
});

// Yangi mahsulot qo'shish
router.post('/', authenticate, isAdminOrManager, upload.single('image'), async (req, res) => {
    try {
        const { name, nameUz, description, isbn, barcode, categoryId, authorId, costPrice, prices } = req.body;

        if (!name || !nameUz) {
            return res.status(400).json({ error: 'Mahsulot nomi kiritilishi shart' });
        }

        const product = await prisma.product.create({
            data: {
                name,
                nameUz,
                description,
                isbn,
                barcode,
                categoryId: categoryId ? parseInt(categoryId) : null,
                authorId: authorId ? parseInt(authorId) : null,
                costPrice: costPrice ? parseFloat(costPrice) : 0,
                image: req.file ? `/uploads/${req.file.filename}` : null
            },
            include: { category: true, author: true }
        });

        // Narxlarni qo'shish
        if (prices) {
            const pricesData = JSON.parse(prices);
            for (const p of pricesData) {
                await prisma.productPrice.create({
                    data: {
                        productId: product.id,
                        currencyId: parseInt(p.currencyId),
                        price: parseFloat(p.price)
                    }
                });
            }
        }

        const fullProduct = await prisma.product.findUnique({
            where: { id: product.id },
            include: {
                category: true,
                author: true,
                prices: { include: { currency: true } },
                stocks: true
            }
        });

        res.status(201).json(fullProduct);
    } catch (error) {
        res.status(500).json({ error: 'Server xatosi', message: error.message });
    }
});

// Mahsulotni yangilash
router.put('/:id', authenticate, isAdminOrManager, upload.single('image'), async (req, res) => {
    try {
        const { name, nameUz, description, isbn, barcode, categoryId, authorId, costPrice, isActive, prices } = req.body;

        const updateData = {
            name,
            nameUz,
            description,
            isbn,
            barcode,
            categoryId: categoryId ? parseInt(categoryId) : null,
            authorId: authorId ? parseInt(authorId) : null,
            costPrice: costPrice ? parseFloat(costPrice) : undefined,
            isActive: isActive !== undefined ? isActive === 'true' : undefined
        };

        if (req.file) {
            updateData.image = `/uploads/${req.file.filename}`;
        }

        await prisma.product.update({
            where: { id: parseInt(req.params.id) },
            data: updateData
        });

        // Narxlarni yangilash
        if (prices) {
            const pricesData = JSON.parse(prices);

            // Mavjud narxlarni o'chirish
            await prisma.productPrice.deleteMany({
                where: { productId: parseInt(req.params.id) }
            });

            // Yangi narxlarni qo'shish
            for (const p of pricesData) {
                await prisma.productPrice.create({
                    data: {
                        productId: parseInt(req.params.id),
                        currencyId: parseInt(p.currencyId),
                        price: parseFloat(p.price)
                    }
                });
            }
        }

        const product = await prisma.product.findUnique({
            where: { id: parseInt(req.params.id) },
            include: {
                category: true,
                author: true,
                prices: { include: { currency: true } },
                stocks: { include: { warehouse: true } }
            }
        });

        res.json(product);
    } catch (error) {
        res.status(500).json({ error: 'Server xatosi', message: error.message });
    }
});

// Mahsulotni o'chirish
router.delete('/:id', authenticate, isAdminOrManager, async (req, res) => {
    try {
        await prisma.product.update({
            where: { id: parseInt(req.params.id) },
            data: { isActive: false }
        });

        res.json({ message: 'Mahsulot o\'chirildi' });
    } catch (error) {
        res.status(500).json({ error: 'Server xatosi', message: error.message });
    }
});

// Mahsulot zaxirasini qo'lda o'zgartirish
router.post('/:id/adjust-stock', authenticate, isAdminOrManager, async (req, res) => {
    try {
        const { warehouseId, quantity, note } = req.body;
        const productId = parseInt(req.params.id);

        if (!warehouseId || quantity === undefined) {
            return res.status(400).json({ error: 'Ombor va miqdor kiritilishi shart' });
        }

        // Joriy zaxirani olish yoki yaratish
        let stock = await prisma.productStock.findUnique({
            where: {
                productId_warehouseId: {
                    productId,
                    warehouseId: parseInt(warehouseId)
                }
            }
        });

        const oldQuantity = stock ? stock.quantity : 0;
        const newQuantity = parseInt(quantity);
        const difference = newQuantity - oldQuantity;

        if (!stock) {
            stock = await prisma.productStock.create({
                data: {
                    productId,
                    warehouseId: parseInt(warehouseId),
                    quantity: newQuantity
                }
            });
        } else {
            stock = await prisma.productStock.update({
                where: { id: stock.id },
                data: { quantity: newQuantity }
            });
        }

        // Mahsulot harakatini qayd etish
        await prisma.productMovement.create({
            data: {
                productId,
                warehouseId: parseInt(warehouseId),
                userId: req.user.id,
                type: 'ADJUSTMENT',
                quantity: difference,
                quantityAfter: newQuantity,
                note: note || 'Qo\'lda o\'zgartirish'
            }
        });

        res.json({ message: 'Zaxira muvaffaqiyatli o\'zgartirildi', stock });
    } catch (error) {
        res.status(500).json({ error: 'Server xatosi', message: error.message });
    }
});

export default router;
