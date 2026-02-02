import { useState, useEffect } from 'react';
import api from '../services/api';
import { Wallet, Plus, ArrowLeftRight, X } from 'lucide-react';

export default function CashRegisters() {
    const [registers, setRegisters] = useState([]);
    const [branches, setBranches] = useState([]);
    const [currencies, setCurrencies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showTransfer, setShowTransfer] = useState(false);
    const [formData, setFormData] = useState({ name: '', branchId: '', currencyId: '' });
    const [transferData, setTransferData] = useState({ fromRegisterId: '', toRegisterId: '', amount: '' });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [registersRes, branchesRes, currenciesRes] = await Promise.all([
                api.get('/cash-registers'),
                api.get('/branches'),
                api.get('/currencies')
            ]);
            setRegisters(registersRes.data);
            setBranches(branchesRes.data.filter(b => b.isActive));
            setCurrencies(currenciesRes.data.filter(c => c.isActive));
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/cash-registers', formData);
            fetchData();
            setShowModal(false);
            setFormData({ name: '', branchId: '', currencyId: '' });
        } catch (error) {
            alert(error.response?.data?.error || 'Xatolik');
        }
    };

    const handleTransfer = async (e) => {
        e.preventDefault();
        try {
            await api.post('/money-transfers', transferData);
            fetchData();
            setShowTransfer(false);
            setTransferData({ fromRegisterId: '', toRegisterId: '', amount: '' });
        } catch (error) {
            alert(error.response?.data?.error || 'Xatolik');
        }
    };

    const formatCurrency = (amount, symbol = 'so\'m') => {
        return new Intl.NumberFormat('uz-UZ').format(amount) + ' ' + symbol;
    };

    if (loading) {
        return <div className="loading"><div className="spinner"></div></div>;
    }

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Kassalar</h1>
                    <p className="page-breadcrumb">Kassa balanslari va boshqaruvi</p>
                </div>
                <div className="flex gap-1">
                    <button className="btn btn-secondary" onClick={() => setShowTransfer(true)}>
                        <ArrowLeftRight size={18} />
                        Pul o'tkazish
                    </button>
                    <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                        <Plus size={18} />
                        Yangi kassa
                    </button>
                </div>
            </div>

            <div className="stats-grid">
                {registers.map(register => (
                    <div key={register.id} className="stat-card success">
                        <div className="stat-icon success">
                            <Wallet size={24} />
                        </div>
                        <div className="stat-content">
                            <h3>{register.name}</h3>
                            <div className="stat-value">{formatCurrency(register.balance, register.currency?.symbol)}</div>
                            <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                                {register.branch?.name}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* New Register Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Yangi kassa</h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Kassa nomi</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Filial</label>
                                    <select
                                        className="form-input form-select"
                                        value={formData.branchId}
                                        onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                                        required
                                    >
                                        <option value="">Tanlang</option>
                                        {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
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
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Bekor qilish</button>
                                <button type="submit" className="btn btn-primary">Yaratish</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Transfer Modal */}
            {showTransfer && (
                <div className="modal-overlay" onClick={() => setShowTransfer(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Pul o'tkazish</h3>
                            <button className="modal-close" onClick={() => setShowTransfer(false)}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleTransfer}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Qaysi kassadan</label>
                                    <select
                                        className="form-input form-select"
                                        value={transferData.fromRegisterId}
                                        onChange={(e) => setTransferData({ ...transferData, fromRegisterId: e.target.value })}
                                        required
                                    >
                                        <option value="">Tanlang</option>
                                        {registers.map(r => (
                                            <option key={r.id} value={r.id}>
                                                {r.name} ({formatCurrency(r.balance, r.currency?.symbol)})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Qaysi kassaga</label>
                                    <select
                                        className="form-input form-select"
                                        value={transferData.toRegisterId}
                                        onChange={(e) => setTransferData({ ...transferData, toRegisterId: e.target.value })}
                                        required
                                    >
                                        <option value="">Tanlang</option>
                                        {registers.filter(r => r.id !== parseInt(transferData.fromRegisterId)).map(r => (
                                            <option key={r.id} value={r.id}>{r.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Miqdor</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        value={transferData.amount}
                                        onChange={(e) => setTransferData({ ...transferData, amount: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowTransfer(false)}>Bekor qilish</button>
                                <button type="submit" className="btn btn-primary">O'tkazish</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
