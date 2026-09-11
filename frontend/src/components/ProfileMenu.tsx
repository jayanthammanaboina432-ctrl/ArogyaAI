import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { initials, titleCase } from '../utils/format';

export default function ProfileMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  if (!user) return null;

  function handleLogout() {
    setOpen(false);
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="profile-menu" ref={containerRef}>
      <button
        className="profile-avatar-btn"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Open profile menu"
        type="button"
      >
        <span className="profile-avatar">{initials(user.name)}</span>
      </button>

      {open && (
        <div className="profile-dropdown" role="menu">
          <div className="profile-dropdown-header">
            <span className="profile-avatar profile-avatar-lg">{initials(user.name)}</span>
            <div>
              <div className="profile-dropdown-name">{titleCase(user.name)}</div>
              <div className="profile-dropdown-email">{user.email}</div>
            </div>
          </div>
          <div className="profile-dropdown-divider" />
          <Link
            to="/profile"
            className="profile-dropdown-item"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            View Profile
          </Link>
          <button
            className="profile-dropdown-item profile-dropdown-logout"
            role="menuitem"
            onClick={handleLogout}
            type="button"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
