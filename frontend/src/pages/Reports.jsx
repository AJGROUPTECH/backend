import { useState, useEffect } from 'react';
import api from '../services/api';
import { BarChart3, TrendingUp, DollarSign, Calendar } from 'lucide-react';

export default function Reports() {
    const [profitLoss, setProfitLoss] = useState(null);
    const [topProducts, setTopProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState({
        startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        fetchData();
    }, [dateRange]);

    const fetchData = async () => {
        try {
            const [profitRes, topRes] = await Promise.all([
                api.get('/analytics/profit-loss', { params: dateRange }),
                api.get('/reports/top-products', { params: { ...dateRange, limit: 10 } })
            ]);
            setProfitLoss(profitRes.data);
            setTopProducts(topRes.data);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('uz-UZ').format(amount || 0) + ' so\'m';
    };

    if (loading) {
        return <div className="loading"><div className="spinner"></div></div>;
    }

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Hisobotlar</h1>
                    <p className="page-breadcrumb">Foyda, sotuvlar va tahlil</p>
                </div>
                <div className="flex gap-1 items-center">
                    <Calendar size={18} color="var(--gray-400)" />
                    <input
                        type="date"
                        className="form-input"
                        value={dateRange.startDate}
                        onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                    />
                    <span>—</span>
                    <input
                        type="date"
                        className="form-input"
                        value={dateRange.endDate}
                        onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                    />
                </div>
            </div>

            {/* Summary Stats */}
            <div className="stats-grid">
                <div className="stat-card primary">
                    <div className="stat-icon primary">
                        <BarChart3 size={24} />
                    </div>
                    <div className="stat-content">
                        <h3>Jami sotuvlar</h3>
                        <div className="stat-value">{profitLoss?.summary?.totalSales || 0}</div>
                    </div>
                </div>
                <div className="stat-card success">
                    <div className="stat-icon success">
                        <DollarSign size={24} />
                    </div>
                    <div className="stat-content">
                        <h3>Daromad</h3>
                        <div className="stat-value">{formatCurrency(profitLoss?.summary?.totalRevenue)}</div>
                    </div>
                </div>
                <div className="stat-card warning">
                    <div className="stat-icon warning">
                        <TrendingUp size={24} />
                    </div>
                    <div className="stat-content">
                        <h3>Sof foyda</h3>
                        <div className="stat-value">{formatCurrency(profitLoss?.summary?.totalProfit)}</div>
                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                            Margin: {profitLoss?.summary?.grossMargin}
                        </div>
                    </div>
                </div>
                <div className="stat-card danger">
                    <div className="stat-icon danger">
                        <DollarSign size={24} />
                    </div>
                    <div className="stat-content">
                        <h3>Tannarx</h3>
                        <div className="stat-value">{formatCurrency(profitLoss?.summary?.totalCost)}</div>
                    </div>
                </div>
            </div>

            <div className="grid-2">
                {/* Daily Breakdown */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Kunlik ko'rsatkichlar</h3>
                    </div>
                    <div className="card-body" style={{ padding: 0 }}>
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Sana</th>
                                        <th>Sotuvlar</th>
                                        <th>Daromad</th>
                                        <th>Foyda</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {profitLoss?.daily?.map((day, idx) => (
                                        <tr key={idx}>
                                            <td>{new Date(day.date).toLocaleDateString('uz-UZ')}</td>
                                            <td>{day.count}</td>
                                            <td>{formatCurrency(day.revenue)}</td>
                                            <td className="text-success">+{formatCurrency(day.profit)}</td>
                                        </tr>
                                    )) || (
                                            <tr>
                                                <td colSpan="4" className="text-center text-muted">Ma'lumot yo'q</td>
                                            </tr>
                                        )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Top Products */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Eng ko'p sotilgan</h3>
                    </div>
                    <div className="card-body" style={{ padding: 0 }}>
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Mahsulot</th>
                                        <th>Soni</th>
                                        <th>Daromad</th>
                                        <th>Foyda</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {topProducts.length > 0 ? topProducts.map((item, idx) => (
                                        <tr key={idx}>
                                            <td>
                                                <strong>{item.product?.nameUz}</strong>
                                                {item.product?.author && (
                                                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                                                        {item.product.author.name}
                                                    </div>
                                                )}
                                            </td>
                                            <td><span className="badge badge-primary">{item.totalQuantity}</span></td>
                                            <td>{formatCurrency(item.totalRevenue)}</td>
                                            <td className="text-success">+{formatCurrency(item.totalProfit)}</td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan="4" className="text-center text-muted">Ma'lumot yo'q</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
