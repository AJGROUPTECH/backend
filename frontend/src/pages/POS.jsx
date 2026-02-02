import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import {
    Search,
    ShoppingCart,
    Plus,
    Minus,
    Trash2,
    CreditCard,
    Banknote,
    Smartphone,
    CheckCircle,
    BookOpen,
    Barcode
} from 'lucide-react';

export default function POS() {
    const [products, setProducts] = useState([]);
    const [cart, setCart] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [showCheckout, setShowCheckout] = useState(false);
    const [config, setConfig] = useState({
        currencies: [],
        paymentTypes: [],
        branches: [],
        warehouses: [],
        cashRegisters: []
    });
    const [saleConfig, setSaleConfig] = useState({
        currencyId: null,
        paymentTypeId: null,
        warehouseId: null,
        branchId: null,
        cashRegisterId: null,
        customerName: ''
    });
    const searchRef = useRef(null);

    useEffect(() => {
        fetchData();
        searchRef.current?.focus();
    }, []);

    const fetchData = async () => {
        try {
            const [productsRes, currenciesRes, paymentTypesRes, branchesRes, warehousesRes, cashRegistersRes] =
                await Promise.all([
                    api.get('/products'),
                    api.get('/currencies'),
                    api.get('/payment-types'),
                    api.get('/branches'),
                    api.get('/warehouses'),
                    api.get('/cash-registers')
                ]);

            setProducts(productsRes.data);

            const currencies = currenciesRes.data.filter(c => c.isActive);
            const paymentTypes = paymentTypesRes.data.filter(p => p.isActive);
            const branches = branchesRes.data.filter(b => b.isActive);
            const warehouses = warehousesRes.data.filter(w => w.isActive);
            const cashRegisters = cashRegistersRes.data.filter(cr => cr.isActive);

            setConfig({ currencies, paymentTypes, branches, warehouses, cashRegisters });

            // Default qiymatlar
            setSaleConfig({
                currencyId: currencies[0]?.id,
                paymentTypeId: paymentTypes[0]?.id,
                warehouseId: warehouses[0]?.id,
                branchId: branches[0]?.id,
                cashRegisterId: cashRegisters[0]?.id,
                customerName: ''
            });
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const getProductStock = (product) => {
        const stock = product.stocks?.find(s => s.warehouseId === saleConfig.warehouseId);
        return stock?.quantity || 0;
    };

    const getProductPrice = (product) => {
        const price = product.prices?.find(p => p.currencyId === saleConfig.currencyId);
        return price?.price || 0;
    };

    const filteredProducts = products.filter(p => {
        const searchLower = search.toLowerCase();
        return (
            p.name.toLowerCase().includes(searchLower) ||
            p.nameUz.toLowerCase().includes(searchLower) ||
            p.isbn?.toLowerCase().includes(searchLower) ||
            p.barcode?.toLowerCase().includes(searchLower) ||
            p.author?.name.toLowerCase().includes(searchLower)
        );
    });

    const addToCart = (product) => {
        const stock = getProductStock(product);
        if (stock <= 0) return;

        setCart(prev => {
            const existing = prev.find(item => item.productId === product.id);
            if (existing) {
                if (existing.quantity >= stock) return prev;
                return prev.map(item =>
                    item.productId === product.id
                        ? { ...item, quantity: item.quantity + 1, totalPrice: (item.quantity + 1) * item.unitPrice }
                        : item
                );
            }
            return [...prev, {
                productId: product.id,
                product,
                quantity: 1,
                unitPrice: getProductPrice(product),
                totalPrice: getProductPrice(product),
                maxStock: stock
            }];
        });
    };

    const updateQuantity = (productId, delta) => {
        setCart(prev => prev.map(item => {
            if (item.productId !== productId) return item;
            const newQty = Math.max(1, Math.min(item.maxStock, item.quantity + delta));
            return { ...item, quantity: newQty, totalPrice: newQty * item.unitPrice };
        }));
    };

    const removeFromCart = (productId) => {
        setCart(prev => prev.filter(item => item.productId !== productId));
    };

    const cartTotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);

    const handleBarcodeSearch = async (e) => {
        if (e.key === 'Enter' && search.trim()) {
            try {
                const res = await api.get(`/products/barcode/${search.trim()}`);
                if (res.data) {
                    addToCart(res.data);
                    setSearch('');
                }
            } catch (err) {
                // Agar shtrix-kod topilmasa, oddiy qidiruv natijalarini ko'rsatish
            }
        }
    };

    const handleCheckout = async () => {
        if (cart.length === 0) return;

        setProcessing(true);
        try {
            const saleData = {
                branchId: saleConfig.branchId,
                cashRegisterId: saleConfig.cashRegisterId,
                currencyId: saleConfig.currencyId,
                paymentTypeId: saleConfig.paymentTypeId,
                warehouseId: saleConfig.warehouseId,
                customerName: saleConfig.customerName || undefined,
                items: cart.map(item => ({
                    productId: item.productId,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice
                }))
            };

            await api.post('/sales', saleData);

            setCart([]);
            setShowCheckout(false);
            setSaleConfig(prev => ({ ...prev, customerName: '' }));

            // Mahsulotlarni yangilash
            fetchData();

            alert('Sotuv muvaffaqiyatli amalga oshirildi!');
        } catch (error) {
            alert(error.response?.data?.error || 'Sotuvda xatolik yuz berdi');
        } finally {
            setProcessing(false);
        }
    };

    const formatCurrency = (amount) => {
        const currency = config.currencies.find(c => c.id === saleConfig.currencyId);
        return `${new Intl.NumberFormat('uz-UZ').format(amount)} ${currency?.symbol || 'so\'m'}`;
    };

    if (loading) {
        return <div className="loading"><div className="spinner"></div></div>;
    }

    return (
        <div className="pos-container">
            {/* Products Section */}
            <div className="pos-products">
                <div className="pos-search">
                    <div style={{ position: 'relative' }}>
                        <Search
                            size={20}
                            style={{
                                position: 'absolute',
                                left: '1rem',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: 'var(--gray-400)'
                            }}
                        />
                        <input
                            ref={searchRef}
                            type="text"
                            className="pos-search-input"
                            placeholder="Kitob nomi, muallif yoki shtrix-kod..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={handleBarcodeSearch}
                        />
                        <Barcode
                            size={20}
                            style={{
                                position: 'absolute',
                                right: '1rem',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: 'var(--gray-400)'
                            }}
                        />
                    </div>

                    {/* Config selectors */}
                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem' }}>
                        <select
                            className="form-input form-select"
                            style={{ flex: 1 }}
                            value={saleConfig.warehouseId || ''}
                            onChange={(e) => setSaleConfig(prev => ({ ...prev, warehouseId: parseInt(e.target.value) }))}
                        >
                            {config.warehouses.map(w => (
                                <option key={w.id} value={w.id}>{w.name}</option>
                            ))}
                        </select>
                        <select
                            className="form-input form-select"
                            style={{ flex: 1 }}
                            value={saleConfig.currencyId || ''}
                            onChange={(e) => setSaleConfig(prev => ({ ...prev, currencyId: parseInt(e.target.value) }))}
                        >
                            {config.currencies.map(c => (
                                <option key={c.id} value={c.id}>{c.nameUz} ({c.symbol})</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="pos-grid">
                    {filteredProducts.map(product => {
                        const stock = getProductStock(product);
                        const price = getProductPrice(product);
                        const isOutOfStock = stock <= 0;

                        return (
                            <div
                                key={product.id}
                                className={`pos-product-card ${isOutOfStock ? 'out-of-stock' : ''}`}
                                onClick={() => !isOutOfStock && addToCart(product)}
                            >
                                <div className="pos-product-image">
                                    {product.image ? (
                                        <img src={product.image} alt={product.nameUz} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'var(--radius)' }} />
                                    ) : (
                                        <BookOpen size={32} />
                                    )}
                                </div>
                                <div className="pos-product-name" title={product.nameUz}>
                                    {product.nameUz}
                                </div>
                                <div className="pos-product-author">
                                    {product.author?.name || 'Noma\'lum muallif'}
                                </div>
                                <div className="pos-product-price">
                                    {formatCurrency(price)}
                                </div>
                                <div className={`pos-product-stock ${stock <= 5 ? 'low' : ''}`}>
                                    {isOutOfStock ? 'Qolmagan' : `${stock} dona`}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Cart Section */}
            <div className="pos-cart">
                <div className="cart-header">
                    <h2>
                        <ShoppingCart size={20} />
                        Savat ({cart.length})
                    </h2>
                </div>

                <div className="cart-items">
                    {cart.length === 0 ? (
                        <div className="empty-state">
                            <ShoppingCart size={48} />
                            <h3>Savat bo'sh</h3>
                            <p>Mahsulotlarni tanlang</p>
                        </div>
                    ) : (
                        cart.map(item => (
                            <div key={item.productId} className="cart-item">
                                <div className="cart-item-info">
                                    <div className="cart-item-name">{item.product.nameUz}</div>
                                    <div className="cart-item-price">{formatCurrency(item.unitPrice)}</div>
                                </div>
                                <div className="cart-item-qty">
                                    <button className="qty-btn" onClick={() => updateQuantity(item.productId, -1)}>
                                        <Minus size={14} />
                                    </button>
                                    <span style={{ minWidth: '24px', textAlign: 'center' }}>{item.quantity}</span>
                                    <button className="qty-btn" onClick={() => updateQuantity(item.productId, 1)}>
                                        <Plus size={14} />
                                    </button>
                                </div>
                                <div className="cart-item-total">{formatCurrency(item.totalPrice)}</div>
                                <button className="cart-item-remove" onClick={() => removeFromCart(item.productId)}>
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))
                    )}
                </div>

                <div className="cart-footer">
                    <div className="cart-summary">
                        <div className="cart-summary-row">
                            <span>Mahsulotlar:</span>
                            <span>{cart.reduce((sum, item) => sum + item.quantity, 0)} dona</span>
                        </div>
                        <div className="cart-summary-row total">
                            <span>Jami:</span>
                            <span>{formatCurrency(cartTotal)}</span>
                        </div>
                    </div>

                    <button
                        className="btn btn-success checkout-btn"
                        disabled={cart.length === 0}
                        onClick={() => setShowCheckout(true)}
                    >
                        <CheckCircle size={20} />
                        Sotishni yakunlash
                    </button>
                </div>
            </div>

            {/* Checkout Modal */}
            {showCheckout && (
                <div className="modal-overlay" onClick={() => setShowCheckout(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px' }}>
                        <div className="modal-header">
                            <h3 className="modal-title">Sotuvni yakunlash</h3>
                            <button className="modal-close" onClick={() => setShowCheckout(false)}>✕</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">To'lov turi</label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                                    {config.paymentTypes.map(pt => (
                                        <button
                                            key={pt.id}
                                            className={`btn ${saleConfig.paymentTypeId === pt.id ? 'btn-primary' : 'btn-secondary'}`}
                                            onClick={() => setSaleConfig(prev => ({ ...prev, paymentTypeId: pt.id }))}
                                        >
                                            {pt.name === 'Cash' ? <Banknote size={16} /> :
                                                pt.name === 'Card' ? <CreditCard size={16} /> :
                                                    <Smartphone size={16} />}
                                            {pt.nameUz}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Kassa</label>
                                <select
                                    className="form-input form-select"
                                    value={saleConfig.cashRegisterId || ''}
                                    onChange={(e) => setSaleConfig(prev => ({ ...prev, cashRegisterId: parseInt(e.target.value) }))}
                                >
                                    {config.cashRegisters.map(cr => (
                                        <option key={cr.id} value={cr.id}>{cr.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Xaridor ismi (ixtiyoriy)</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Xaridor ismi"
                                    value={saleConfig.customerName}
                                    onChange={(e) => setSaleConfig(prev => ({ ...prev, customerName: e.target.value }))}
                                />
                            </div>

                            <div style={{
                                background: 'var(--gray-50)',
                                padding: '1.25rem',
                                borderRadius: 'var(--radius-md)',
                                marginTop: '1rem'
                            }}>
                                <div className="cart-summary-row total" style={{ border: 'none', padding: 0, margin: 0 }}>
                                    <span>Jami to'lov:</span>
                                    <span style={{ color: 'var(--primary)' }}>{formatCurrency(cartTotal)}</span>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowCheckout(false)}>
                                Bekor qilish
                            </button>
                            <button
                                className="btn btn-success"
                                onClick={handleCheckout}
                                disabled={processing}
                            >
                                {processing ? 'Jarayonda...' : 'Tasdiqlash'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
