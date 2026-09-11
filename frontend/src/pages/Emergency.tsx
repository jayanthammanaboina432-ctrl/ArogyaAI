import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { EmergencyIcon } from '../components/icons';

type Config = { emergencyServiceNumber: string; emergencyContactNumber: string };

function telHref(phone: string) {
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}

export default function Emergency() {
  const [config, setConfig] = useState<Config | null>(null);

  useEffect(() => {
    api<Config>('/emergency/config', { auth: true })
      .then(setConfig)
      .catch(() => setConfig({ emergencyServiceNumber: '112', emergencyContactNumber: '' }));
  }, []);

  return (
    <div className="content-narrow emergency-page">
      <div className="emergency-hero">
        <span className="service-icon emergency-hero-icon">
          <EmergencyIcon />
        </span>
        <h1>Emergency / SOS</h1>
        <p className="page-subtitle">
          If this is a life-threatening emergency, call emergency services immediately.
        </p>
      </div>

      <div className="emergency-actions">
        <a
          href={config ? telHref(config.emergencyServiceNumber) : undefined}
          className="btn btn-emergency"
        >
          Call Emergency Service{config ? ` (${config.emergencyServiceNumber})` : ''}
        </a>

        {config?.emergencyContactNumber ? (
          <a href={telHref(config.emergencyContactNumber)} className="btn btn-emergency-secondary">
            Call Emergency Contact
          </a>
        ) : (
          <div className="emergency-note">
            No emergency contact number configured yet.
          </div>
        )}

        <Link to="/healthcare-finder" className="btn btn-emergency-secondary">
          Find Hospital
        </Link>

        <Link to="/dashboard" className="btn btn-ghost btn-block">
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
