import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

// Import routes
import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import branchesRoutes from './routes/branches.js';
import warehousesRoutes from './routes/warehouses.js';
import categoriesRoutes from './routes/categories.js';
import authorsRoutes from './routes/authors.js';
import productsRoutes from './routes/products.js';
import suppliersRoutes from './routes/suppliers.js';
import currenciesRoutes from './routes/currencies.js';
import paymentTypesRoutes from './routes/paymentTypes.js';
import cashRegistersRoutes from './routes/cashRegisters.js';
import circulatingFundsRoutes from './routes/circulatingFunds.js';
import moneyTransfersRoutes from './routes/moneyTransfers.js';
import purchasesRoutes from './routes/purchases.js';
import salesRoutes from './routes/sales.js';
import reportsRoutes from './routes/reports.js';
import analyticsRoutes from './routes/analytics.js';

// Import Telegram bot
import { initTelegramBot } from './services/telegram.js';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: true, // Barcha domenlardan ruxsat
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

// Make prisma available to routes
app.use((req, res, next) => {
  req.prisma = prisma;
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/branches', branchesRoutes);
app.use('/api/warehouses', warehousesRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/authors', authorsRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/suppliers', suppliersRoutes);
app.use('/api/currencies', currenciesRoutes);
app.use('/api/payment-types', paymentTypesRoutes);
app.use('/api/cash-registers', cashRegistersRoutes);
app.use('/api/circulating-funds', circulatingFundsRoutes);
app.use('/api/money-transfers', moneyTransfersRoutes);
app.use('/api/purchases', purchasesRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/analytics', analyticsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Bookshop ERP API ishlayapti!' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Serverda xatolik yuz berdi',
    message: err.message
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server ${PORT} portda ishga tushdi`);
  console.log(`📚 Bookshop ERP API: http://localhost:${PORT}/api`);

  // Telegram bot ishga tushirish
  initTelegramBot();
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit();
});
