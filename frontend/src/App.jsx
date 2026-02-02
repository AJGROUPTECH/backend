import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import POS from './pages/POS';
import Sales from './pages/Sales';
import Inventory from './pages/Inventory';
import Purchases from './pages/Purchases';
import CashRegisters from './pages/CashRegisters';
import Reports from './pages/Reports';
import Settings from './pages/Settings';

function PrivateRoute({ children }) {
    const { isAuthenticated, loading } = useAuth();

    if (loading) {
        return (
            <div className="loading" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="spinner"></div>
            </div>
        );
    }

    return isAuthenticated ? children : <Navigate to="/login" />;
}

function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/" element={
                        <PrivateRoute>
                            <Layout />
                        </PrivateRoute>
                    }>
                        <Route index element={<Dashboard />} />
                        <Route path="pos" element={<POS />} />
                        <Route path="products" element={<Products />} />
                        <Route path="sales" element={<Sales />} />
                        <Route path="inventory" element={<Inventory />} />
                        <Route path="purchases" element={<Purchases />} />
                        <Route path="cash-registers" element={<CashRegisters />} />
                        <Route path="reports" element={<Reports />} />
                        <Route path="settings" element={<Settings />} />
                    </Route>
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}

export default App;
