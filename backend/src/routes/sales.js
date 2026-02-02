import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Barcha sotuvlarni olish
router.get('/', authenticate, async (req, res) => {
    try {
        const { branchId, startDate, endDate } = req.query;

        const where = {};
        if (branchId) where.branchId = parseInt(branchId);

        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) where.createdAt.gte = new Date(startDate);
            if (endDate) where.createdAt.lte = new Date(endDate);
        }

        const sales = await prisma.sale.findMany({
            where,
            include: {
                branch: true,
                cashRegister: { include: { currency: true } },
                user: { select: { id: true, fullName: true } },
                currency: true,
                paymentType: true,
                items: {
                    include: { product: { include: { author: true } }, warehouse: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(sales);
    } catch (error) {
        res.status(500).json({ error: 'Server xatosi', message: error.message });
    }
});

// Bitta sotuvni olish
router.get('/:id', authenticate, async (req, res) => {
    try {
        const sale = await prisma.sale.findUnique({
            where: { id: parseInt(req.params.id) },
            include: {
                branch: true,
                cashRegister: { include: { currency: true } },
                user: { select: { id: true, fullName: true } },
                currency: true,
                paymentType: true,
                items: {
                    include: { product: { include: { author: true } }, warehouse: true }
                }
            }
        });

        if (!sale) {
            return res.status(404).json({ error: 'Sotuv topilmadi' });
        }

        res.json(sale);
    } catch (error) {
        res.status(500).json({ error: 'Server xatosi', message: error.message });
    }
});

// YANGI SOTUV YARATISH (POS)
router.post('/', authenticate, async (req, res) => {
    try {
        const {
            branchId,
            cashRegisterId,
            currencyId,
            paymentTypeId,
            warehouseId,
            customerName,
            items,
            discount,
            note
        } = req.body;

        // Validatsiya
        if (!branchId || !cashRegisterId || !currencyId || !paymentTypeId || !warehouseId || !items || items.length === 0) {
            return res.status(400).json({
                error: 'Filial, kassa, valyuta, to\'lov turi, ombor va mahsulotlar kiritilishi shart'
            });
        }

        // Kassani tekshirish
        const cashRegister = await prisma.cashRegister.findUnique({
            where: { id: parseInt(cashRegisterId) }
        });

        if (!cashRegister) {
            return res.status(404).json({ error: 'Kassa topilmadi' });
        }

        // Narxlarni hisoblash va zaxirani tekshirish
        let subtotal = 0;
        let costTotal = 0;
        const saleItems = [];

        for (const item of items) {
            const product = await prisma.product.findUnique({
                where: { id: parseInt(item.productId) },
                include: {
                    prices: { where: { currencyId: parseInt(currencyId) } }
                }
            });

            if (!product) {
                return res.status(404).json({ error: `Mahsulot #${item.productId} topilmadi` });
            }

            // Zaxirani tekshirish
            const stock = await prisma.productStock.findUnique({
                where: {
                    productId_warehouseId: {
                        productId: parseInt(item.productId),
                        warehouseId: parseInt(warehouseId)
                    }
                }
            });

            const availableQty = stock?.quantity || 0;
            const requestedQty = parseInt(item.quantity);

            if (availableQty < requestedQty) {
                return res.status(400).json({
                    error: `"${product.nameUz}" mahsuloti yetarli emas. Mavjud: ${availableQty}, So'ralgan: ${requestedQty}`
                });
            }

            // Narxni olish
            const unitPrice = item.unitPrice
                ? parseFloat(item.unitPrice)
                : (product.prices[0]?.price || 0);

            const costPrice = product.costPrice || 0;
            const totalPrice = unitPrice * requestedQty;
            const itemCost = costPrice * requestedQty;
            const itemProfit = totalPrice - itemCost;

            subtotal += totalPrice;
            costTotal += itemCost;

            saleItems.push({
                productId: parseInt(item.productId),
                warehouseId: parseInt(warehouseId),
                quantity: requestedQty,
                unitPrice,
                costPrice,
                totalPrice,
                profit: itemProfit,
                stock
            });
        }

        const discountAmount = discount ? parseFloat(discount) : 0;
        const totalAmount = subtotal - discountAmount;
        const totalProfit = totalAmount - costTotal;

        // Sotuvni yaratish
        const sale = await prisma.sale.create({
            data: {
                branchId: parseInt(branchId),
                cashRegisterId: parseInt(cashRegisterId),
                userId: req.user.id,
                currencyId: parseInt(currencyId),
                paymentTypeId: parseInt(paymentTypeId),
                customerName,
                subtotal,
                discount: discountAmount,
                totalAmount,
                costTotal,
                profit: totalProfit,
                note
            }
        });

        // Sotuv buyumlarini yaratish va zaxirani kamaytirish
        for (const saleItem of saleItems) {
            // Sotuv buyumini yaratish
            await prisma.saleItem.create({
                data: {
                    saleId: sale.id,
                    productId: saleItem.productId,
                    warehouseId: saleItem.warehouseId,
                    quantity: saleItem.quantity,
                    unitPrice: saleItem.unitPrice,
                    costPrice: saleItem.costPrice,
                    totalPrice: saleItem.totalPrice,
                    profit: saleItem.profit
                }
            });

            // Zaxirani kamaytirish
            const newQuantity = saleItem.stock.quantity - saleItem.quantity;

            await prisma.productStock.update({
                where: { id: saleItem.stock.id },
                data: { quantity: newQuantity }
            });

            // Mahsulot harakatini qayd etish
            await prisma.productMovement.create({
                data: {
                    productId: saleItem.productId,
                    warehouseId: saleItem.warehouseId,
                    userId: req.user.id,
                    type: 'OUT',
                    quantity: saleItem.quantity,
                    quantityAfter: newQuantity,
                    referenceType: 'SALE',
                    referenceId: sale.id,
                    note: `Sotuv #${sale.id}`
                }
            });
        }

        // Kassa balansini oshirish
        const newCashBalance = cashRegister.balance + totalAmount;

        await prisma.cashRegister.update({
            where: { id: parseInt(cashRegisterId) },
            data: { balance: newCashBalance }
        });

        // Moliyaviy harakatni qayd etish
        await prisma.financialMovement.create({
            data: {
                cashRegisterId: parseInt(cashRegisterId),
                currencyId: parseInt(currencyId),
                paymentTypeId: parseInt(paymentTypeId),
                userId: req.user.id,
                type: 'INFLOW',
                amount: totalAmount,
                balanceAfter: newCashBalance,
                referenceType: 'SALE',
                referenceId: sale.id,
                note: `Sotuv #${sale.id}`
            }
        });

        // To'liq sotuvni qaytarish
        const fullSale = await prisma.sale.findUnique({
            where: { id: sale.id },
            include: {
                branch: true,
                cashRegister: { include: { currency: true } },
                user: { select: { id: true, fullName: true } },
                currency: true,
                paymentType: true,
                items: {
                    include: { product: { include: { author: true } }, warehouse: true }
                }
            }
        });

        res.status(201).json({
            message: 'Sotuv muvaffaqiyatli amalga oshirildi',
            sale: fullSale
        });
    } catch (error) {
        console.error('Sale error:', error);
        res.status(500).json({ error: 'Server xatosi', message: error.message });
    }
});

export default router;
