import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ProfileMenu from './ProfileMenu';

export default function Navbar() {
  const { user } = useAuth();

  return (
    <header className="navbar">
      <Link to={user ? '/dashboard' : '/'} className="brand">
        <span className="brand-mark">+</span> ArogyaAI
      </Link>
      <nav className="nav-links">
        {user ? (
          <ProfileMenu />
        ) : (
          <>
            <Link to="/login" className="btn btn-ghost">
              Login
            </Link>
            <Link to="/register" className="btn btn-primary">
              Register
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
