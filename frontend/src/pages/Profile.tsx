import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/PageHeader';
import { initials, titleCase } from '../utils/format';

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="content-narrow">
      <PageHeader title="My Profile" subtitle="Your ArogyaAI account details." />

      <div className="panel profile-page-panel">
        <span className="profile-avatar profile-avatar-xl">{initials(user.name)}</span>

        <dl className="profile-fields">
          <div className="profile-field">
            <dt>Full name</dt>
            <dd>{titleCase(user.name)}</dd>
          </div>
          <div className="profile-field">
            <dt>Email</dt>
            <dd>{user.email}</dd>
          </div>
          <div className="profile-field">
            <dt>Phone</dt>
            <dd>{user.phone || 'Not provided'}</dd>
          </div>
          <div className="profile-field">
            <dt>Member since</dt>
            <dd>{formatDate(user.createdAt)}</dd>
          </div>
        </dl>

        <button className="btn btn-ghost btn-block" onClick={handleLogout} type="button">
          Logout
        </button>
      </div>
    </div>
  );
}
