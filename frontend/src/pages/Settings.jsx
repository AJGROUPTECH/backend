import { useState, useEffect } from 'react';
import api from '../services/api';
import { Settings as SettingsIcon, Plus, Edit, Trash2, X, Users, Building, Warehouse, DollarSign, CreditCard, Truck } from 'lucide-react';

const TABS = [
    { id: 'users', label: 'Foydalanuvchilar', icon: Users },
    { id: 'branches', label: 'Filiallar', icon: Building },
    { id: 'warehouses', label: 'Omborlar', icon: Warehouse },
    { id: 'currencies', label: 'Valyutalar', icon: DollarSign },
    { id: 'paymentTypes', label: 'To\'lov turlari', icon: CreditCard },
    { id: 'suppliers', label: 'Yetkazib beruvchilar', icon: Truck }
];

export default function Settings() {
    const [activeTab, setActiveTab] = useState('users');
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [formData, setFormData] = useState({});
    const [branches, setBranches] = useState([]);

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const endpoints = {
                users: '/users',
                branches: '/branches',
                warehouses: '/warehouses',
                currencies: '/currencies',
                paymentTypes: '/payment-types',
                suppliers: '/suppliers'
            };
            const res = await api.get(endpoints[activeTab]);
            setData(res.data);

            if (activeTab === 'users' || activeTab === 'warehouses') {
                const branchesRes = await api.get('/branches');
                setBranches(branchesRes.data.filter(b => b.isActive));
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const openModal = (item = null) => {
        setEditing(item);
        if (item) {
            setFormData({ ...item });
        } else {
            setFormData(getDefaultFormData());
        }
        setShowModal(true);
    };

    const getDefaultFormData = () => {
        switch (activeTab) {
            case 'users': return { username: '', password: '', fullName: '', role: 'CASHIER', branchId: '' };
            case 'branches': return { name: '', address: '', phone: '' };
            case 'warehouses': return { name: '', branchId: '', lowStockThreshold: 5 };
            case 'currencies': return { code: '', name: '', nameUz: '', symbol: '', rate: 1 };
            case 'paymentTypes': return { name: '', nameUz: '' };
            case 'suppliers': return { name: '', phone: '', address: '' };
            default: return {};
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const endpoints = {
                users: '/users',
                branches: '/branches',
                warehouses: '/warehouses',
                currencies: '/currencies',
                paymentTypes: '/payment-types',
                suppliers: '/suppliers'
            };

            if (editing) {
                await api.put(`${endpoints[activeTab]}/${editing.id}`, formData);
            } else {
                await api.post(endpoints[activeTab], formData);
            }

            fetchData();
            setShowModal(false);
        } catch (error) {
            alert(error.response?.data?.error || 'Xatolik');
        }
    };

    const handleDelete = async (id) => {
        if (confirm('O\'chirmoqchimisiz?')) {
            const endpoints = {
                users: '/users',
                branches: '/branches',
                warehouses: '/warehouses',
                currencies: '/currencies',
                paymentTypes: '/payment-types',
                suppliers: '/suppliers'
            };
            await api.delete(`${endpoints[activeTab]}/${id}`);
            fetchData();
        }
    };

    const renderForm = () => {
        switch (activeTab) {
            case 'users':
                return (
                    <>
                        <div className="form-group">
                            <label className="form-label">Foydalanuvchi nomi</label>
                            <input type="text" className="form-input" value={formData.username || ''}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })} required disabled={!!editing} />
                        </div>
                        {!editing && (
                            <div className="form-group">
                                <label className="form-label">Parol</label>
                                <input type="password" className="form-input" value={formData.password || ''}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })} required />
                            </div>
                        )}
                        <div className="form-group">
                            <label className="form-label">To'liq ism</label>
                            <input type="text" className="form-input" value={formData.fullName || ''}
                                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Rol</label>
                            <select className="form-input form-select" value={formData.role || 'CASHIER'}
                                onChange={(e) => setFormData({ ...formData, role: e.target.value })}>
                                <option value="ADMIN">Administrator</option>
                                <option value="MANAGER">Menejer</option>
                                <option value="CASHIER">Kassir</option>
                                <option value="WAREHOUSE_STAFF">Omborchi</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Filial</label>
                            <select className="form-input form-select" value={formData.branchId || ''}
                                onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}>
                                <option value="">Tanlang</option>
                                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                        </div>
                    </>
                );
            case 'branches':
                return (
                    <>
                        <div className="form-group">
                            <label className="form-label">Filial nomi</label>
                            <input type="text" className="form-input" value={formData.name || ''}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Manzil</label>
                            <input type="text" className="form-input" value={formData.address || ''}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Telefon</label>
                            <input type="text" className="form-input" value={formData.phone || ''}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                        </div>
                    </>
                );
            case 'warehouses':
                return (
                    <>
                        <div className="form-group">
                            <label className="form-label">Ombor nomi</label>
                            <input type="text" className="form-input" value={formData.name || ''}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Filial</label>
                            <select className="form-input form-select" value={formData.branchId || ''}
                                onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}>
                                <option value="">Tanlang</option>
                                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Kam zaxira chegarasi</label>
                            <input type="number" className="form-input" value={formData.lowStockThreshold || 5}
                                onChange={(e) => setFormData({ ...formData, lowStockThreshold: e.target.value })} />
                        </div>
                    </>
                );
            case 'currencies':
                return (
                    <>
                        <div className="grid-2">
                            <div className="form-group">
                                <label className="form-label">Kod</label>
                                <input type="text" className="form-input" value={formData.code || ''}
                                    onChange={(e) => setFormData({ ...formData, code: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Belgi</label>
                                <input type="text" className="form-input" value={formData.symbol || ''}
                                    onChange={(e) => setFormData({ ...formData, symbol: e.target.value })} required />
                            </div>
                        </div>
                        <div className="grid-2">
                            <div className="form-group">
                                <label className="form-label">Nomi (inglizcha)</label>
                                <input type="text" className="form-input" value={formData.name || ''}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Nomi (o'zbekcha)</label>
                                <input type="text" className="form-input" value={formData.nameUz || ''}
                                    onChange={(e) => setFormData({ ...formData, nameUz: e.target.value })} required />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Kurs (UZS ga nisbatan)</label>
                            <input type="number" className="form-input" value={formData.rate || 1}
                                onChange={(e) => setFormData({ ...formData, rate: e.target.value })} />
                        </div>
                    </>
                );
            case 'paymentTypes':
                return (
                    <>
                        <div className="form-group">
                            <label className="form-label">Nomi (inglizcha)</label>
                            <input type="text" className="form-input" value={formData.name || ''}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Nomi (o'zbekcha)</label>
                            <input type="text" className="form-input" value={formData.nameUz || ''}
                                onChange={(e) => setFormData({ ...formData, nameUz: e.target.value })} required />
                        </div>
                    </>
                );
            case 'suppliers':
                return (
                    <>
                        <div className="form-group">
                            <label className="form-label">Nomi</label>
                            <input type="text" className="form-input" value={formData.name || ''}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Telefon</label>
                            <input type="text" className="form-input" value={formData.phone || ''}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Manzil</label>
                            <input type="text" className="form-input" value={formData.address || ''}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
                        </div>
                    </>
                );
            default:
                return null;
        }
    };

    const getColumns = () => {
        switch (activeTab) {
            case 'users': return ['To\'liq ism', 'Foydalanuvchi', 'Rol', 'Filial'];
            case 'branches': return ['Nomi', 'Manzil', 'Telefon'];
            case 'warehouses': return ['Nomi', 'Filial', 'Kam zaxira chegarasi'];
            case 'currencies': return ['Kod', 'Nomi', 'Belgi', 'Kurs'];
            case 'paymentTypes': return ['Nomi', 'O\'zbekcha'];
            case 'suppliers': return ['Nomi', 'Telefon', 'Manzil'];
            default: return [];
        }
    };

    const renderRow = (item) => {
        switch (activeTab) {
            case 'users': return [item.fullName, item.username, item.role, item.branch?.name || '-'];
            case 'branches': return [item.name, item.address || '-', item.phone || '-'];
            case 'warehouses': return [item.name, item.branch?.name || '-', item.lowStockThreshold];
            case 'currencies': return [item.code, item.nameUz, item.symbol, item.rate];
            case 'paymentTypes': return [item.name, item.nameUz];
            case 'suppliers': return [item.name, item.phone || '-', item.address || '-'];
            default: return [];
        }
    };

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Sozlamalar</h1>
                    <p className="page-breadcrumb">Tizim sozlamalari va kataloglar</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
                <div className="card-body" style={{ padding: '0.5rem' }}>
                    <div className="flex gap-1" style={{ overflowX: 'auto' }}>
                        {TABS.map(tab => (
                            <button
                                key={tab.id}
                                className={`btn ${activeTab === tab.id ? 'btn-primary' : 'btn-secondary'}`}
                                onClick={() => setActiveTab(tab.id)}
                            >
                                <tab.icon size={16} />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="card">
                <div className="card-header">
                    <h3 className="card-title">{TABS.find(t => t.id === activeTab)?.label}</h3>
                    <button className="btn btn-primary btn-sm" onClick={() => openModal()}>
                        <Plus size={16} />
                        Qo'shish
                    </button>
                </div>
                <div className="card-body" style={{ padding: 0 }}>
                    {loading ? (
                        <div className="loading"><div className="spinner"></div></div>
                    ) : (
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        {getColumns().map((col, idx) => <th key={idx}>{col}</th>)}
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.map(item => (
                                        <tr key={item.id}>
                                            {renderRow(item).map((cell, idx) => <td key={idx}>{cell}</td>)}
                                            <td>
                                                <div className="flex gap-1">
                                                    <button className="btn btn-icon btn-secondary btn-sm" onClick={() => openModal(item)}>
                                                        <Edit size={14} />
                                                    </button>
                                                    <button className="btn btn-icon btn-secondary btn-sm" onClick={() => handleDelete(item.id)}>
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">{editing ? 'Tahrirlash' : 'Yangi qo\'shish'}</h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">{renderForm()}</div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Bekor qilish</button>
                                <button type="submit" className="btn btn-primary">Saqlash</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
