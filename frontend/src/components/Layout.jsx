import { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    LayoutDashboard,
    ShoppingCart,
    Package,
    History,
    Warehouse,
    ShoppingBag,
    Wallet,
    BarChart3,
    Settings,
    LogOut,
    BookOpen,
    User,
    Menu,
    X
} from 'lucide-react';

const navItems = [
    {
        section: 'Asosiy', items: [
            { path: '/', icon: LayoutDashboard, label: 'Bosh sahifa' },
            { path: '/pos', icon: ShoppingCart, label: 'Sotuv / Kassa' },
        ]
    },
    {
        section: 'Katalog', items: [
            { path: '/products', icon: Package, label: 'Mahsulotlar' },
            { path: '/inventory', icon: Warehouse, label: 'Ombor' },
        ]
    },
    {
        section: 'Operatsiyalar', items: [
            { path: '/sales', icon: History, label: 'Sotuvlar tarixi' },
            { path: '/purchases', icon: ShoppingBag, label: 'Xaridlar' },
        ]
    },
    {
        section: 'Moliya', items: [
            { path: '/cash-registers', icon: Wallet, label: 'Kassalar' },
            { path: '/reports', icon: BarChart3, label: 'Hisobotlar' },
        ]
    },
    {
        section: 'Tizim', items: [
            { path: '/settings', icon: Settings, label: 'Sozlamalar' },
        ]
    }
];

export default function Layout() {
    const { user, logout } = useAuth();
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Close sidebar when route changes (mobile)
    useEffect(() => {
        setSidebarOpen(false);
    }, [location.pathname]);

    // Close sidebar when clicking outside
    const handleOverlayClick = () => {
        setSidebarOpen(false);
    };

    // Prevent body scroll when sidebar is open on mobile
    useEffect(() => {
        if (sidebarOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [sidebarOpen]);

    return (
        <div className="app-container">
            {/* Mobile Menu Button */}
            <button
                className="mobile-menu-btn"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                aria-label="Menyu"
            >
                {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {/* Overlay for mobile */}
            <div
                className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
                onClick={handleOverlayClick}
            />

            {/* Sidebar */}
            <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <div className="sidebar-logo">
                        <div className="sidebar-logo-icon">
                            <BookOpen size={24} />
                        </div>
                        <h1>Kutubxona ERP</h1>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    {navItems.map((section, idx) => (
                        <div key={idx} className="nav-section">
                            <div className="nav-section-title">{section.section}</div>
                            {section.items.map((item) => (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    className={({ isActive }) =>
                                        `nav-link ${isActive || (item.path === '/' && location.pathname === '/') ? 'active' : ''}`
                                    }
                                    end={item.path === '/'}
                                    onClick={() => setSidebarOpen(false)}
                                >
                                    <item.icon size={20} />
                                    <span>{item.label}</span>
                                </NavLink>
                            ))}
                        </div>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <div className="user-info">
                        <div className="user-avatar">
                            <User size={20} />
                        </div>
                        <div className="user-details">
                            <h4>{user?.fullName || 'Foydalanuvchi'}</h4>
                            <p>{user?.role === 'ADMIN' ? 'Administrator' :
                                user?.role === 'MANAGER' ? 'Menejer' :
                                    user?.role === 'CASHIER' ? 'Kassir' : 'Xodim'}</p>
                        </div>
                        <button
                            className="btn btn-icon btn-secondary"
                            onClick={logout}
                            title="Chiqish"
                            style={{ marginLeft: 'auto' }}
                        >
                            <LogOut size={18} />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="main-content">
                <Outlet />
            </main>
        </div>
    );
}
