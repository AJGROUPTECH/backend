import { useState, useEffect } from 'react';
import api from '../services/api';
import { Plus, Search, Edit, Trash2, BookOpen, X } from 'lucide-react';

export default function Products() {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [authors, setAuthors] = useState([]);
    const [currencies, setCurrencies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        nameUz: '',
        description: '',
        isbn: '',
        barcode: '',
        categoryId: '',
        authorId: '',
        costPrice: '',
        prices: []
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [productsRes, categoriesRes, authorsRes, currenciesRes] = await Promise.all([
                api.get('/products'),
                api.get('/categories'),
                api.get('/authors'),
                api.get('/currencies')
            ]);
            setProducts(productsRes.data);
            setCategories(categoriesRes.data);
            setAuthors(authorsRes.data);
            setCurrencies(currenciesRes.data.filter(c => c.isActive));
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.nameUz.toLowerCase().includes(search.toLowerCase()) ||
        p.isbn?.toLowerCase().includes(search.toLowerCase())
    );

    const openModal = (product = null) => {
        if (product) {
            setEditingProduct(product);
            setFormData({
                name: product.name,
                nameUz: product.nameUz,
                description: product.description || '',
                isbn: product.isbn || '',
                barcode: product.barcode || '',
                categoryId: product.categoryId || '',
                authorId: product.authorId || '',
                costPrice: product.costPrice || '',
                prices: currencies.map(c => ({
                    currencyId: c.id,
                    price: product.prices?.find(p => p.currencyId === c.id)?.price || ''
                }))
            });
        } else {
            setEditingProduct(null);
            setFormData({
                name: '',
                nameUz: '',
                description: '',
                isbn: '',
                barcode: '',
                categoryId: '',
                authorId: '',
                costPrice: '',
                prices: currencies.map(c => ({ currencyId: c.id, price: '' }))
            });
        }
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const data = new FormData();
            Object.keys(formData).forEach(key => {
                if (key === 'prices') {
                    data.append('prices', JSON.stringify(formData.prices.filter(p => p.price)));
                } else if (formData[key]) {
                    data.append(key, formData[key]);
                }
            });

            if (editingProduct) {
                await api.put(`/products/${editingProduct.id}`, data, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            } else {
                await api.post('/products', data, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            }

            fetchData();
            setShowModal(false);
        } catch (error) {
            alert(error.response?.data?.error || 'Xatolik yuz berdi');
        }
    };

    const handleDelete = async (id) => {
        if (confirm('Mahsulotni o\'chirmoqchimisiz?')) {
            await api.delete(`/products/${id}`);
            fetchData();
        }
    };

    const formatCurrency = (price) => {
        return new Intl.NumberFormat('uz-UZ').format(price) + ' so\'m';
    };

    if (loading) {
        return <div className="loading"><div className="spinner"></div></div>;
    }

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Mahsulotlar</h1>
                    <p className="page-breadcrumb">Barcha kitoblar va mahsulotlar</p>
                </div>
                <button className="btn btn-primary" onClick={() => openModal()}>
                    <Plus size={18} />
                    Mahsulot qo'shish
                </button>
            </div>

            <div className="card">
                <div className="card-header">
                    <div style={{ position: 'relative', width: '300px' }}>
                        <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
                        <input
                            type="text"
                            className="form-input"
                            style={{ paddingLeft: '40px' }}
                            placeholder="Qidirish..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>
                <div className="card-body" style={{ padding: 0 }}>
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Mahsulot</th>
                                    <th>Kategoriya</th>
                                    <th>Muallif</th>
                                    <th>ISBN</th>
                                    <th>Narx</th>
                                    <th>Zaxira</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredProducts.map(product => (
                                    <tr key={product.id}>
                                        <td>
                                            <div className="flex items-center gap-2">
                                                <div style={{
                                                    width: '40px',
                                                    height: '50px',
                                                    background: 'var(--gray-100)',
                                                    borderRadius: 'var(--radius-sm)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}>
                                                    <BookOpen size={18} color="var(--gray-400)" />
                                                </div>
                                                <div>
                                                    <strong>{product.nameUz}</strong>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>{product.name}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            {product.category && (
                                                <span className="badge badge-primary">
                                                    {product.category.icon} {product.category.nameUz}
                                                </span>
                                            )}
                                        </td>
                                        <td>{product.author?.name || '-'}</td>
                                        <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{product.isbn || '-'}</td>
                                        <td>
                                            {product.prices?.[0] && (
                                                <strong>{formatCurrency(product.prices[0].price)}</strong>
                                            )}
                                        </td>
                                        <td>
                                            {product.stocks?.reduce((sum, s) => sum + s.quantity, 0) || 0}
                                        </td>
                                        <td>
                                            <div className="flex gap-1">
                                                <button className="btn btn-icon btn-secondary btn-sm" onClick={() => openModal(product)}>
                                                    <Edit size={14} />
                                                </button>
                                                <button className="btn btn-icon btn-secondary btn-sm" onClick={() => handleDelete(product.id)}>
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
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
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
                        <div className="modal-header">
                            <h3 className="modal-title">{editingProduct ? 'Mahsulotni tahrirlash' : 'Yangi mahsulot'}</h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="grid-2">
                                    <div className="form-group">
                                        <label className="form-label">Nomi (lotincha)</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Nomi (o'zbekcha)</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={formData.nameUz}
                                            onChange={(e) => setFormData({ ...formData, nameUz: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="grid-2">
                                    <div className="form-group">
                                        <label className="form-label">Kategoriya</label>
                                        <select
                                            className="form-input form-select"
                                            value={formData.categoryId}
                                            onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                                        >
                                            <option value="">Tanlang</option>
                                            {categories.map(c => (
                                                <option key={c.id} value={c.id}>{c.icon} {c.nameUz}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Muallif</label>
                                        <select
                                            className="form-input form-select"
                                            value={formData.authorId}
                                            onChange={(e) => setFormData({ ...formData, authorId: e.target.value })}
                                        >
                                            <option value="">Tanlang</option>
                                            {authors.map(a => (
                                                <option key={a.id} value={a.id}>{a.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid-2">
                                    <div className="form-group">
                                        <label className="form-label">ISBN</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={formData.isbn}
                                            onChange={(e) => setFormData({ ...formData, isbn: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Shtrix-kod</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={formData.barcode}
                                            onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Sotib olish narxi</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        value={formData.costPrice}
                                        onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Sotish narxlari</label>
                                    <div className="grid-2" style={{ marginTop: '0.5rem' }}>
                                        {formData.prices.map((p, idx) => {
                                            const currency = currencies.find(c => c.id === p.currencyId);
                                            return (
                                                <div key={p.currencyId} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <span style={{ minWidth: '60px' }}>{currency?.code}:</span>
                                                    <input
                                                        type="number"
                                                        className="form-input"
                                                        placeholder="0"
                                                        value={p.price}
                                                        onChange={(e) => {
                                                            const newPrices = [...formData.prices];
                                                            newPrices[idx].price = e.target.value;
                                                            setFormData({ ...formData, prices: newPrices });
                                                        }}
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                                    Bekor qilish
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    {editingProduct ? 'Saqlash' : 'Qo\'shish'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
