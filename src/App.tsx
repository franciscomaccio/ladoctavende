import { HashRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import Promotions from './pages/Promotions';
import { useAuth } from './hooks/useAuth';
import { ShieldCheck, Home as HomeIcon, Search, Tag, UserCircle, LogOut } from 'lucide-react';

function Navigation() {
  const { user, isAdmin, signOut } = useAuth();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    // Optional: reload or navigate to home
  };

  return (
    <>
      <header className="navbar">
        <Link to="/" className="logo">
          <img src="logo.png" alt="La Docta Vende" style={{ height: '40px' }} />
        </Link>
        <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
          {isAdmin && (
            <Link to="/admin" style={{ color: 'var(--primary)', display: 'flex' }} title="Admin">
              <ShieldCheck size={24} />
            </Link>
          )}
          {user ? (
            <>
              <Link to="/dashboard" style={{ color: 'var(--text-main)', display: 'flex' }} title="Mi Cuenta">
                <UserCircle size={28} />
              </Link>
              <button
                onClick={handleSignOut}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--error)', display: 'flex' }}
                title="Cerrar Sesión"
              >
                <LogOut size={24} />
              </button>
            </>
          ) : (
            <Link to="/auth" style={{ color: 'var(--text-main)', display: 'flex' }} title="Ingresar">
              <UserCircle size={28} />
            </Link>
          )}
        </div>
      </header>

      <main style={{ paddingBottom: '70px' }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/promos" element={<Promotions />} />
        </Routes>
      </main>

      <nav className="bottom-nav">
        <Link to="/" className={`nav-item ${location.pathname === '/' ? 'active' : ''}`}>
          <HomeIcon size={24} />
          <span>Inicio</span>
        </Link>
        <Link
          to="/"
          className="nav-item"
          onClick={(e) => {
            if (location.pathname === '/') {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
              setTimeout(() => {
                document.getElementById('search-input')?.focus();
              }, 100);
            }
          }}
        >
          <Search size={24} />
          <span>Buscar</span>
        </Link>
        <Link to="/promos" className={`nav-item ${location.pathname === '/promos' ? 'active' : ''}`}>
          <Tag size={24} />
          <span>Promos</span>
        </Link>
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
