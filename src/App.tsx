import { HashRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import { useAuth } from './hooks/useAuth';
import { LogOut, User, ShieldCheck } from 'lucide-react';

function App() {
  const { user, isAdmin, signOut } = useAuth();

  return (
    <Router>
      <header className="navbar glass-card" style={{ margin: '1rem 2rem', borderRadius: '15px' }}>
        <Link to="/" className="logo">
          <img src="logo.png" alt="La Docta Vende" className="logo-img" onError={(e) => (e.currentTarget.style.display = 'none')} />
          {import.meta.env.VITE_APP_ENV === 'test' && (
            <span className="logo-text" style={{ marginLeft: '10px' }}>
              TEST v{import.meta.env.VITE_APP_VERSION || '0'}
            </span>
          )}
        </Link>
        <nav style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <Link to="/" style={{ color: 'white', textDecoration: 'none' }}>Inicio</Link>
          {isAdmin && (
            <Link to="/admin" style={{ color: 'var(--accent)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <ShieldCheck size={18} /> Admin
            </Link>
          )}
          {user ? (
            <>
              <Link to="/dashboard" style={{ color: 'white', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <User size={18} /> Mi Cuenta
              </Link>
              <button
                onClick={() => signOut()}
                style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
              >
                <LogOut size={18} /> Salir
              </button>
            </>
          ) : (
            <Link to="/auth" className="btn-primary" style={{ textDecoration: 'none', padding: '8px 16px' }}>
              Soy Negocio
            </Link>
          )}
        </nav>
      </header>

      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/admin" element={<AdminDashboard />} />
        </Routes>
      </main>

      <footer style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
        <p>© 2026 La Docta Vende - Todos los derechos reservados.</p>
        <p style={{ marginTop: '0.5rem', opacity: 0.7 }}>v{import.meta.env.VITE_APP_VERSION || '0.0.1'}</p>
      </footer>
    </Router>
  );
}

export default App;
