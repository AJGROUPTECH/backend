import { useState, useEffect } from 'react';
import api from '../services/api';
import {
    TrendingUp,
    DollarSign,
    ShoppingCart,
    Package,
    AlertTriangle,
    RefreshCw,
    ArrowUp,
    ArrowDown
} from 'lucide-react';

export default function Dashboard() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = async () => {
        try {
            const res = await api.get('/analytics/dashboard');
            setData(res.data);
        } catch (error) {
            console.error('Dashboard error:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
        // Har 30 sekundda yangilash (real-time)
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, []);

    const handleRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const formatNumber = (num) => {
        if (!num) return '0';
        return new Intl.NumberFormat('uz-UZ').format(num);
    };

    const formatCurrency = (num) => {
        if (!num) return '0 so\'m';
        return formatNumber(num) + ' so\'m';
    };

    if (loading) {
        return (
            <div className="loading">
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div>
            {/* Header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">Bosh sahifa</h1>
                    <p className="page-breadcrumb">Real vaqtda tahlil va statistika</p>
                </div>
                <button
                    className="btn btn-secondary"
                    onClick={handleRefresh}
                    disabled={refreshing}
                >
                    <RefreshCw size={18} className={refreshing ? 'spinning' : ''} />
                    Yangilash
                </button>
            </div>

            {/* Stats Grid */}
            <div className="stats-grid">
                <div className="stat-card primary">
                    <div className="stat-icon primary">
                        <ShoppingCart size={24} />
                    </div>
                    <div className="stat-content">
                        <h3>Bugungi sotuvlar</h3>
                        <div className="stat-value">{data?.today?.salesCount || 0}</div>
                        <div className="stat-change positive">
                            <ArrowUp size={14} />
                            {formatCurrency(data?.today?.revenue)}
                        </div>
                    </div>
                </div>

                <div className="stat-card success">
                    <div className="stat-icon success">
                        <TrendingUp size={24} />
                    </div>
                    <div className="stat-content">
                        <h3>Bugungi foyda</h3>
                        <div className="stat-value">{formatCurrency(data?.today?.profit)}</div>
                        <div className="stat-change positive">
                            <ArrowUp size={14} />
                            Sof foyda
                        </div>
                    </div>
                </div>

                <div className="stat-card warning">
                    <div className="stat-icon warning">
                        <DollarSign size={24} />
                    </div>
                    <div className="stat-content">
                        <h3>Oylik daromad</h3>
                        <div className="stat-value">{formatCurrency(data?.month?.revenue)}</div>
                        <div className="stat-change positive">
                            <ArrowUp size={14} />
                            {data?.month?.salesCount || 0} ta sotuv
                        </div>
                    </div>
                </div>

                <div className="stat-card danger">
                    <div className="stat-icon danger">
                        <Package size={24} />
                    </div>
                    <div className="stat-content">
                        <h3>Kam qolgan</h3>
                        <div className="stat-value">{data?.lowStockAlerts?.count || 0}</div>
                        <div className="stat-change negative">
                            <AlertTriangle size={14} />
                            Diqqat talab qiladi
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Grid */}
            <div className="grid-2">
                {/* Low Stock Alerts */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">
                            <AlertTriangle size={20} color="var(--warning)" />
                            Kam qolgan mahsulotlar
                        </h3>
                    </div>
                    <div className="card-body">
                        {data?.lowStockAlerts?.items?.length > 0 ? (
                            <div className="table-container">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>Mahsulot</th>
                                            <th>Ombor</th>
                                            <th>Qolgan</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.lowStockAlerts.items.map((item) => (
                                            <tr key={item.id}>
                                                <td>
                                                    <strong>{item.product?.nameUz}</strong>
                                                    {item.product?.author && (
                                                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                                                            {item.product.author.name}
                                                        </div>
                                                    )}
                                                </td>
                                                <td>{item.warehouse?.name}</td>
                                                <td>
                                                    <span className={`badge ${item.quantity === 0 ? 'badge-danger' : 'badge-warning'}`}>
                                                        {item.quantity} dona
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="empty-state">
                                <Package size={48} />
                                <h3>Hammasi yaxshi!</h3>
                                <p>Hozircha kam qolgan mahsulotlar yo'q</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Recent Sales */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">
                            <ShoppingCart size={20} color="var(--primary)" />
                            So'nggi sotuvlar
                        </h3>
                    </div>
                    <div className="card-body">
                        {data?.recentSales?.length > 0 ? (
                            <div className="table-container">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>Summa</th>
                                            <th>Foyda</th>
                                            <th>To'lov</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.recentSales.slice(0, 8).map((sale) => (
                                            <tr key={sale.id}>
                                                <td>#{sale.id}</td>
                                                <td><strong>{formatCurrency(sale.amount)}</strong></td>
                                                <td className="text-success">+{formatCurrency(sale.profit)}</td>
                                                <td>
                                                    <span className="badge badge-primary">{sale.paymentType}</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="empty-state">
                                <ShoppingCart size={48} />
                                <h3>Sotuvlar yo'q</h3>
                                <p>Bugun hali sotuv amalga oshirilmagan</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Cash Register Balances */}
            <div className="card" style={{ marginTop: '1.5rem' }}>
                <div className="card-header">
                    <h3 className="card-title">
                        <DollarSign size={20} color="var(--success)" />
                        Kassa balanslari
                    </h3>
                </div>
                <div className="card-body">
                    {data?.cashRegisters?.details?.length > 0 ? (
                        <div className="stats-grid" style={{ marginBottom: 0 }}>
                            {data.cashRegisters.details.map((cr) => (
                                <div key={cr.id} className="stat-card" style={{ paddingTop: '1rem' }}>
                                    <div className="stat-content">
                                        <h3>{cr.name}</h3>
                                        <div className="stat-value">{formatNumber(cr.balance)} {cr.currency}</div>
                                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                                            {cr.branch}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-muted">Kassalar topilmadi</p>
                    )}
                </div>
            </div>

            {/* Trend Chart */}
            {data?.trend && (
                <div className="card" style={{ marginTop: '1.5rem' }}>
                    <div className="card-header">
                        <h3 className="card-title">
                            <TrendingUp size={20} color="var(--primary)" />
                            Haftalik trend
                        </h3>
                    </div>
                    <div className="card-body">
                        <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                            {data.trend.map((day, idx) => (
                                <div key={idx} style={{
                                    flex: '1 0 100px',
                                    textAlign: 'center',
                                    padding: '1rem',
                                    background: 'var(--gray-50)',
                                    borderRadius: 'var(--radius-md)'
                                }}>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginBottom: '0.5rem' }}>
                                        {new Date(day.date).toLocaleDateString('uz-UZ', { weekday: 'short', day: 'numeric' })}
                                    </div>
                                    <div style={{
                                        height: Math.max(20, Math.min(100, (day.revenue / (data.month?.revenue || 1)) * 500)),
                                        background: 'linear-gradient(180deg, var(--primary), var(--primary-light))',
                                        borderRadius: 'var(--radius-sm)',
                                        marginBottom: '0.5rem'
                                    }}></div>
                                    <div style={{ fontSize: '0.875rem', fontWeight: '600' }}>
                                        {formatNumber(day.revenue)}
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--success)' }}>
                                        +{formatNumber(day.profit)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <style>{`
        .spinning {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
        </div>
    );
}
