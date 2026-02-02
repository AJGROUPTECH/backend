import { useState, useEffect } from 'react';
import api from '../services/api';
import { Plus, ShoppingBag, CheckCircle, X } from 'lucide-react';

export default function Purchases() {
    const [purchases, setPurchases] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [products, setProducts] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [currencies, setCurrencies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        supplierId: '',
        currencyId: '',
        items: [{ productId: '', warehouseId: '', quantity: '', unitPrice: '' }]
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [purchasesRes, suppliersRes, productsRes, warehousesRes, currenciesRes] = await Promise.all([
                api.get('/purchases'),
                api.get('/suppliers'),
                api.get('/products'),
                api.get('/warehouses'),
                api.get('/currencies')
            ]);
            setPurchases(purchasesRes.data);
            setSuppliers(suppliersRes.data.filter(s => s.isActive));
            setProducts(productsRes.data);
            setWarehouses(warehousesRes.data.filter(w => w.isActive));
            setCurrencies(currenciesRes.data.filter(c => c.isActive));
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const addItem = () => {
        setFormData(prev => ({
            ...prev,
            items: [...prev.items, { productId: '', warehouseId: '', quantity: '', unitPrice: '' }]
        }));
    };

    const removeItem = (index) => {
        setFormData(prev => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== index)
        }));
    };

    const updateItem = (index, field, value) => {
        setFormData(prev => ({
            ...prev,
            items: prev.items.map((item, i) => i === index ? { ...item, [field]: value } : item)
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/purchases', {
                supplierId: formData.supplierId,
                currencyId: formData.currencyId,
                items: formData.items.filter(i => i.productId && i.quantity && i.unitPrice)
            });
            fetchData();
            setShowModal(false);
            setFormData({
                supplierId: '',
                currencyId: '',
                items: [{ productId: '', warehouseId: '', quantity: '', unitPrice: '' }]
            });
        } catch (error) {
            alert(error.response?.data?.error || 'Xatolik');
        }
    };

    const handleReceive = async (id) => {
        if (confirm('Xaridni qabul qilmoqchimisiz? Bu omborga tovar qo\'shadi.')) {
            try {
                await api.post(`/purchases/${id}/receive`);
                fetchData();
            } catch (error) {
                alert(error.response?.data?.error || 'Xatolik');
            }
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('uz-UZ').format(amount) + ' so\'m';
    };

    if (loading) {
        return <div className="loading"><div className="spinner"></div></div>;
    }

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Xaridlar</h1>
                    <p className="page-breadcrumb">Yetkazib beruvchilardan xaridlar</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                    <Plus size={18} />
                    Yangi xarid
                </button>
            </div>

            <div className="card">
                <div className="card-body" style={{ padding: 0 }}>
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Sana</th>
                                    <th>Yetkazib beruvchi</th>
                                    <th>Jami</th>
                                    <th>Holat</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {purchases.map(purchase => (
                                    <tr key={purchase.id}>
                                        <td><strong>#{purchase.id}</strong></td>
                                        <td>{new Date(purchase.createdAt).toLocaleDateString('uz-UZ')}</td>
                                        <td>{purchase.supplier?.name}</td>
                                        <td><strong>{formatCurrency(purchase.totalAmount)}</strong></td>
                                        <td>
                                            <span className={`badge ${purchase.status === 'RECEIVED' ? 'badge-success' :
                                                    purchase.status === 'CANCELLED' ? 'badge-danger' : 'badge-warning'
                                                }`}>
                                                {purchase.status === 'RECEIVED' ? 'Qabul qilingan' :
                                                    purchase.status === 'CANCELLED' ? 'Bekor qilingan' : 'Kutilmoqda'}
                                            </span>
                                        </td>
                                        <td>
                                            {purchase.status === 'PENDING' && (
                                                <button
                                                    className="btn btn-success btn-sm"
                                                    onClick={() => handleReceive(purchase.id)}
                                                >
                                                    <CheckCircle size={14} />
                                                    Qabul qilish
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '700px' }}>
                        <div className="modal-header">
                            <h3 className="modal-title">Yangi xarid</h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="grid-2">
                                    <div className="form-group">
                                        <label className="form-label">Yetkazib beruvchi</label>
                                        <select
                                            className="form-input form-select"
                                            value={formData.supplierId}
                                            onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                                            required
                                        >
                                            <option value="">Tanlang</option>
                                            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Valyuta</label>
                                        <select
                                            className="form-input form-select"
                                            value={formData.currencyId}
                                            onChange={(e) => setFormData({ ...formData, currencyId: e.target.value })}
                                            required
                                        >
                                            <option value="">Tanlang</option>
                                            {currencies.map(c => <option key={c.id} value={c.id}>{c.nameUz}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <label className="form-label" style={{ marginTop: '1rem' }}>Mahsulotlar</label>
                                {formData.items.map((item, idx) => (
                                    <div key={idx} className="flex gap-1 mb-1" style={{ alignItems: 'flex-end' }}>
                                        <select
                                            className="form-input form-select"
                                            style={{ flex: 2 }}
                                            value={item.productId}
                                            onChange={(e) => updateItem(idx, 'productId', e.target.value)}
                                            required
                                        >
                                            <option value="">Mahsulot</option>
                                            {products.map(p => <option key={p.id} value={p.id}>{p.nameUz}</option>)}
                                        </select>
                                        <select
                                            className="form-input form-select"
                                            style={{ flex: 1 }}
                                            value={item.warehouseId}
                                            onChange={(e) => updateItem(idx, 'warehouseId', e.target.value)}
                                            required
                                        >
                                            <option value="">Ombor</option>
                                            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                        </select>
                                        <input
                                            type="number"
                                            className="form-input"
                                            style={{ width: '80px' }}
                                            placeholder="Soni"
                                            value={item.quantity}
                                            onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                                            required
                                        />
                                        <input
                                            type="number"
                                            className="form-input"
                                            style={{ width: '100px' }}
                                            placeholder="Narx"
                                            value={item.unitPrice}
                                            onChange={(e) => updateItem(idx, 'unitPrice', e.target.value)}
                                            required
                                        />
                                        {formData.items.length > 1 && (
                                            <button type="button" className="btn btn-icon btn-danger btn-sm" onClick={() => removeItem(idx)}>
                                                <X size={14} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                                <button type="button" className="btn btn-secondary btn-sm" style={{ marginTop: '0.5rem' }} onClick={addItem}>
                                    <Plus size={14} /> Qo'shish
                                </button>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Bekor qilish</button>
                                <button type="submit" className="btn btn-primary">Yaratish</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
