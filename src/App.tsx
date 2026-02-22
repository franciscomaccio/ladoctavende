import { HashRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import { useAuth } from './hooks/useAuth';
import { LogOut, User } from 'lucide-react';

function App() {
  const { user, signOut } = useAuth();

  return (
    <Router>
      <header className="navbar glass-card" style={{ margin: '1rem 2rem', borderRadius: '15px' }}>
        <Link to="/" className="logo">
          <img src="logo.png" alt="La Docta Vende" className="logo-img" onError={(e) => (e.currentTarget.style.display = 'none')} />
          <span className="logo-text">laDoctavende</span>
        </Link>
        <nav style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <Link to="/" style={{ color: 'white', textDecoration: 'none' }}>Inicio</Link>
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
        </Routes>
      </main>

      <footer style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
        © 2026 ladoctavende - Todos los derechos reservados.
      </footer>
    </Router>
  );
}

export default App;
