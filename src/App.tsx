import { HashRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import Home from './pages/Home';
import Index from './pages/Index';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import Promotions from './pages/Promotions';
import About from './pages/About';
import { useAuth } from './hooks/useAuth';
import { ShieldCheck, Home as HomeIcon, Tag, UserCircle, LogOut, Info, PlusCircle, ShoppingBag } from 'lucide-react';

function Navigation() {
  const { user, isAdmin, signOut } = useAuth();
  const location = useLocation();

  const handleSignOut = async () => {
    if (window.confirm('¿Estás seguro que deseas cerrar sesión?')) {
      await signOut();
      // Optional: reload or navigate to home
    }
  };

  const isLandingPage = location.pathname === '/';

  return (
    <>
      {!isLandingPage && (
        <header className="navbar">
          <Link to="/" className="logo">
            <img src="header-logo.png" alt="La Docta Vende" style={{ height: '40px' }} />
          </Link>
          <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
            {isAdmin && (
              <Link to="/admin" style={{ color: 'var(--primary)', display: 'flex' }} title="Admin">
                <ShieldCheck size={24} />
              </Link>
            )}
            <Link to="/info" style={{ color: 'var(--text-main)', display: 'flex' }} title="Información">
              <Info size={24} />
            </Link>
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
      )}

      <main style={{ paddingBottom: isLandingPage ? '0' : '70px' }}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/negocios" element={<Home type="business" />} />
          <Route path="/clasificados" element={<Home type="classified" />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/promos" element={<Promotions />} />
          <Route path="/info" element={<About />} />
        </Routes>
      </main>

      {!isLandingPage && (
        <nav className="bottom-nav">
          <Link to="/negocios" className={`nav-item ${location.pathname === '/negocios' ? 'active' : ''}`}>
            <HomeIcon size={24} />
            <span>Negocios</span>
          </Link>
          <Link to="/promos" className={`nav-item ${location.pathname === '/promos' ? 'active' : ''}`}>
            <Tag size={24} />
            <span>Promos</span>
          </Link>
          <Link to="/clasificados" className={`nav-item ${location.pathname === '/clasificados' ? 'active' : ''}`}>
            <ShoppingBag size={24} />
            <span>Clasificados</span>
          </Link>
          <Link to="/dashboard" className={`nav-item ${location.pathname === '/dashboard' ? 'active' : ''}`}>
            <PlusCircle size={24} />
            <span>Publicar</span>
          </Link>
        </nav>
      )}
    </>
  );
}

function App() {
  return (
    <HelmetProvider>
      <Router>
        <Navigation />
      </Router>
    </HelmetProvider>
  );
}

export default App;
