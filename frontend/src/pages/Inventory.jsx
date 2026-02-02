import { useState, useEffect } from 'react';
import api from '../services/api';
import { Package, AlertTriangle, Edit, Save } from 'lucide-react';

export default function Inventory() {
    const [stocks, setStocks] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedWarehouse, setSelectedWarehouse] = useState('all');
    const [lowStockOnly, setLowStockOnly] = useState(false);
    const [editingStock, setEditingStock] = useState(null);
    const [newQuantity, setNewQuantity] = useState('');

    useEffect(() => {
        fetchData();
    }, [selectedWarehouse, lowStockOnly]);

    const fetchData = async () => {
        try {
            const [stocksRes, warehousesRes] = await Promise.all([
                api.get('/reports/inventory', {
                    params: {
                        warehouseId: selectedWarehouse !== 'all' ? selectedWarehouse : undefined,
                        lowStockOnly: lowStockOnly ? 'true' : undefined
                    }
                }),
                api.get('/warehouses')
            ]);
            setStocks(stocksRes.data.stocks || []);
            setWarehouses(warehousesRes.data);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAdjust = async (stock) => {
        if (editingStock === stock.id) {
            try {
                await api.post(`/products/${stock.productId}/adjust-stock`, {
                    warehouseId: stock.warehouseId,
                    quantity: parseInt(newQuantity),
                    note: 'Qo\'lda tuzatish'
                });
                fetchData();
                setEditingStock(null);
            } catch (error) {
                alert(error.response?.data?.error || 'Xatolik');
            }
        } else {
            setEditingStock(stock.id);
            setNewQuantity(stock.quantity.toString());
        }
    };

    if (loading) {
        return <div className="loading"><div className="spinner"></div></div>;
    }

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Ombor zaxirasi</h1>
                    <p className="page-breadcrumb">Mahsulotlar zaxirasi va boshqaruvi</p>
                </div>
            </div>

            {/* Filters */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
                <div className="card-body">
                    <div className="flex gap-2 items-center">
                        <select
                            className="form-input form-select"
                            style={{ width: '200px' }}
                            value={selectedWarehouse}
                            onChange={(e) => setSelectedWarehouse(e.target.value)}
                        >
                            <option value="all">Barcha omborlar</option>
                            {warehouses.map(w => (
                                <option key={w.id} value={w.id}>{w.name}</option>
                            ))}
                        </select>
                        <label className="flex items-center gap-1" style={{ cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={lowStockOnly}
                                onChange={(e) => setLowStockOnly(e.target.checked)}
                            />
                            <span>Faqat kam qolganlar</span>
                            <AlertTriangle size={16} color="var(--warning)" />
                        </label>
                    </div>
                </div>
            </div>

            <div className="card">
                <div className="card-body" style={{ padding: 0 }}>
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Mahsulot</th>
                                    <th>Kategoriya</th>
                                    <th>Ombor</th>
                                    <th>Zaxira</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {stocks.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>
                                            <Package size={48} color="var(--gray-300)" />
                                            <p className="text-muted" style={{ marginTop: '0.5rem' }}>Zaxira topilmadi</p>
                                        </td>
                                    </tr>
                                ) : stocks.map(stock => (
                                    <tr key={stock.id}>
                                        <td>
                                            <strong>{stock.product?.nameUz}</strong>
                                            {stock.product?.author && (
                                                <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                                                    {stock.product.author.name}
                                                </div>
                                            )}
                                        </td>
                                        <td>
                                            {stock.product?.category && (
                                                <span className="badge badge-primary">
                                                    {stock.product.category.icon} {stock.product.category.nameUz}
                                                </span>
                                            )}
                                        </td>
                                        <td>{stock.warehouse?.name}</td>
                                        <td>
                                            {editingStock === stock.id ? (
                                                <input
                                                    type="number"
                                                    className="form-input"
                                                    style={{ width: '80px' }}
                                                    value={newQuantity}
                                                    onChange={(e) => setNewQuantity(e.target.value)}
                                                    autoFocus
                                                />
                                            ) : (
                                                <span className={`badge ${stock.quantity === 0 ? 'badge-danger' :
                                                        stock.quantity <= 5 ? 'badge-warning' : 'badge-success'
                                                    }`}>
                                                    {stock.quantity} dona
                                                </span>
                                            )}
                                        </td>
                                        <td>
                                            <button
                                                className={`btn btn-sm ${editingStock === stock.id ? 'btn-success' : 'btn-secondary'}`}
                                                onClick={() => handleAdjust(stock)}
                                            >
                                                {editingStock === stock.id ? <Save size={14} /> : <Edit size={14} />}
                                                {editingStock === stock.id ? 'Saqlash' : 'Tuzatish'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
