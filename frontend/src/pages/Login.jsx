import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BookOpen, Lock, User } from 'lucide-react';

export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await login(username, password);
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.error || 'Kirishda xatolik yuz berdi');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="login-header">
                    <div className="login-logo">
                        <BookOpen size={36} />
                    </div>
                    <h1>Kutubxona ERP</h1>
                    <p>Kitob do'koni boshqaruv tizimiga xush kelibsiz</p>
                </div>

                <form className="login-body" onSubmit={handleSubmit}>
                    {error && (
                        <div className="alert alert-danger">
                            {error}
                        </div>
                    )}

                    <div className="form-group">
                        <label className="form-label">Foydalanuvchi nomi</label>
                        <div style={{ position: 'relative' }}>
                            <User
                                size={18}
                                style={{
                                    position: 'absolute',
                                    left: '12px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    color: 'var(--gray-400)'
                                }}
                            />
                            <input
                                type="text"
                                className="form-input"
                                style={{ paddingLeft: '40px' }}
                                placeholder="admin"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                autoFocus
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Parol</label>
                        <div style={{ position: 'relative' }}>
                            <Lock
                                size={18}
                                style={{
                                    position: 'absolute',
                                    left: '12px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    color: 'var(--gray-400)'
                                }}
                            />
                            <input
                                type="password"
                                className="form-input"
                                style={{ paddingLeft: '40px' }}
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary btn-lg"
                        style={{ width: '100%', marginTop: '0.5rem' }}
                        disabled={loading}
                    >
                        {loading ? 'Kirilmoqda...' : 'Kirish'}
                    </button>
                </form>

                <div className="login-footer">
                    <p>Test uchun: admin / admin123</p>
                </div>
            </div>
        </div>
    );
}
