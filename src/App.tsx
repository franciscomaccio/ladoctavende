import { HashRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import { useAuth } from './hooks/useAuth';
import { ShieldCheck, Menu, Home as HomeIcon, Search, Tag, UserCircle } from 'lucide-react';

function Navigation() {
  const { user, isAdmin } = useAuth();
  const location = useLocation();

  return (
    <>
      <header className="navbar">
        <Link to="/" className="logo">
          <img src="logo.png" alt="La Docta Vende" style={{ height: '35px' }} onError={(e) => (e.currentTarget.style.display = 'none')} />
          <span style={{ fontWeight: '800', fontSize: '1.2rem', color: 'var(--primary)' }}>laDocta<span style={{ color: 'var(--accent)' }}>Vende</span></span>
        </Link>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {isAdmin && (
            <Link to="/admin" style={{ color: 'var(--primary)', display: 'flex' }} title="Admin">
              <ShieldCheck size={24} />
            </Link>
          )}
          <button style={{ background: 'none', border: 'none', color: 'var(--text-main)', cursor: 'pointer' }}>
            <Menu size={28} />
          </button>
        </div>
      </header>

      <main style={{ paddingBottom: '70px' }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/admin" element={<AdminDashboard />} />
        </Routes>
      </main>

      <nav className="bottom-nav">
        <Link to="/" className={`nav-item ${location.pathname === '/' ? 'active' : ''}`}>
          <HomeIcon size={24} />
          <span>Inicio</span>
        </Link>
        <Link to="/" className="nav-item">
          <Search size={24} />
          <span>Buscar</span>
        </Link>
        <Link to="/" className="nav-item">
          <Tag size={24} />
          <span>Promos</span>
        </Link>
        {user ? (
          <Link to="/dashboard" className={`nav-item ${location.pathname === '/dashboard' ? 'active' : ''}`}>
            <UserCircle size={24} />
            <span>Cuenta</span>
          </Link>
        ) : (
          <Link to="/auth" className={`nav-item ${location.pathname === '/auth' ? 'active' : ''}`}>
            <UserCircle size={24} />
            <span>Ingresar</span>
          </Link>
        )}
      </nav>
    </>
  );
}

function App() {
  return (
    <Router>
      <Navigation />
    </Router>
  );
}

export default App;
