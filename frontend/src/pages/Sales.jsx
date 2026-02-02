import { useState, useEffect } from 'react';
import api from '../services/api';
import { ShoppingCart, Calendar, Eye } from 'lucide-react';

export default function Sales() {
    const [sales, setSales] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedSale, setSelectedSale] = useState(null);

    useEffect(() => {
        fetchSales();
    }, []);

    const fetchSales = async () => {
        try {
            const res = await api.get('/sales');
            setSales(res.data);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount, currency = 'so\'m') => {
        return new Intl.NumberFormat('uz-UZ').format(amount) + ' ' + currency;
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleString('uz-UZ', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return <div className="loading"><div className="spinner"></div></div>;
    }

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Sotuvlar tarixi</h1>
                    <p className="page-breadcrumb">Barcha amalga oshirilgan sotuvlar</p>
                </div>
            </div>

            <div className="card">
                <div className="card-body" style={{ padding: 0 }}>
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Sana</th>
                                    <th>Kassir</th>
                                    <th>Mahsulotlar</th>
                                    <th>Jami</th>
                                    <th>Foyda</th>
                                    <th>To'lov</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {sales.map(sale => (
                                    <tr key={sale.id}>
                                        <td><strong>#{sale.id}</strong></td>
                                        <td>
                                            <div className="flex items-center gap-1">
                                                <Calendar size={14} color="var(--gray-400)" />
                                                {formatDate(sale.createdAt)}
                                            </div>
                                        </td>
                                        <td>{sale.user?.fullName}</td>
                                        <td>{sale.items?.length} dona</td>
                                        <td><strong>{formatCurrency(sale.totalAmount, sale.currency?.symbol)}</strong></td>
                                        <td className="text-success">+{formatCurrency(sale.profit, sale.currency?.symbol)}</td>
                                        <td><span className="badge badge-primary">{sale.paymentType?.nameUz}</span></td>
                                        <td>
                                            <button
                                                className="btn btn-icon btn-secondary btn-sm"
                                                onClick={() => setSelectedSale(sale)}
                                            >
                                                <Eye size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Sale Detail Modal */}
            {selectedSale && (
                <div className="modal-overlay" onClick={() => setSelectedSale(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Sotuv #{selectedSale.id}</h3>
                            <button className="modal-close" onClick={() => setSelectedSale(null)}>✕</button>
                        </div>
                        <div className="modal-body">
                            <div style={{ marginBottom: '1rem' }}>
                                <div className="flex justify-between mb-1">
                                    <span className="text-muted">Sana:</span>
                                    <span>{formatDate(selectedSale.createdAt)}</span>
                                </div>
                                <div className="flex justify-between mb-1">
                                    <span className="text-muted">Kassir:</span>
                                    <span>{selectedSale.user?.fullName}</span>
                                </div>
                                <div className="flex justify-between mb-1">
                                    <span className="text-muted">To'lov turi:</span>
                                    <span>{selectedSale.paymentType?.nameUz}</span>
                                </div>
                                {selectedSale.customerName && (
                                    <div className="flex justify-between mb-1">
                                        <span className="text-muted">Xaridor:</span>
                                        <span>{selectedSale.customerName}</span>
                                    </div>
                                )}
                            </div>

                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Mahsulot</th>
                                        <th>Soni</th>
                                        <th>Narx</th>
                                        <th>Jami</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedSale.items?.map((item, idx) => (
                                        <tr key={idx}>
                                            <td>{item.product?.nameUz}</td>
                                            <td>{item.quantity}</td>
                                            <td>{formatCurrency(item.unitPrice)}</td>
                                            <td><strong>{formatCurrency(item.totalPrice)}</strong></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            <div style={{
                                marginTop: '1rem',
                                padding: '1rem',
                                background: 'var(--gray-50)',
                                borderRadius: 'var(--radius-md)'
                            }}>
                                <div className="flex justify-between mb-1">
                                    <span>Jami:</span>
                                    <strong>{formatCurrency(selectedSale.subtotal)}</strong>
                                </div>
                                {selectedSale.discount > 0 && (
                                    <div className="flex justify-between mb-1">
                                        <span>Chegirma:</span>
                                        <span className="text-danger">-{formatCurrency(selectedSale.discount)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between font-bold" style={{ fontSize: '1.125rem', paddingTop: '0.5rem', borderTop: '1px solid var(--gray-200)' }}>
                                    <span>To'langan:</span>
                                    <span className="text-success">{formatCurrency(selectedSale.totalAmount)}</span>
                                </div>
                                <div className="flex justify-between mt-1">
                                    <span className="text-muted">Foyda:</span>
                                    <span className="text-success">+{formatCurrency(selectedSale.profit)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
