import type { ComponentType } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { firstName } from '../utils/format';
import {
  SymptomsIcon,
  MedicineIcon,
  FinderIcon,
  ChatbotIcon,
  PrescriptionIcon,
  EmergencyIcon,
} from '../components/icons';

type Service = {
  title: string;
  desc: string;
  path: string;
  Icon: ComponentType<{ className?: string }>;
  enabled: boolean;
};

const SERVICES: Service[] = [
  {
    title: 'Check Symptoms',
    desc: 'Describe your symptoms and get a preliminary AI assessment.',
    path: '/symptoms',
    Icon: SymptomsIcon,
    enabled: true,
  },
  {
    title: 'Medicine Guidance',
    desc: 'General information about common medicines and their use.',
    path: '/medicines',
    Icon: MedicineIcon,
    enabled: true,
  },
  {
    title: 'Hospital & Pharmacy Finder',
    desc: 'Search hospitals and pharmacies by city.',
    path: '/healthcare-finder',
    Icon: FinderIcon,
    enabled: true,
  },
  {
    title: 'AI Healthcare Chatbot',
    desc: 'Ask general healthcare questions and get educational answers.',
    path: '/chat',
    Icon: ChatbotIcon,
    enabled: true,
  },
  {
    title: 'Prescription Reader',
    desc: 'Upload a prescription image to extract readable information.',
    path: '/prescription',
    Icon: PrescriptionIcon,
    enabled: true,
  },
];

function CardBody({ title, desc, Icon, enabled }: Omit<Service, 'path'>) {
  return (
    <>
      <span className="service-icon">
        <Icon />
      </span>
      <h3>{title}</h3>
      <p>{desc}</p>
      {enabled ? (
        <span className="badge badge-ready">Open</span>
      ) : (
        <span className="badge">Coming in a later batch</span>
      )}
    </>
  );
}

const TIPS = [
  'Staying hydrated helps your body regulate temperature and fight off illness.',
  'A short walk after meals can support healthy digestion and blood sugar.',
  '7–9 hours of sleep helps your immune system function at its best.',
  'Washing your hands regularly is still one of the best ways to avoid infection.',
  'Regular health checkups can catch small issues before they become big ones.',
];

function dailyTip() {
  const dayIndex = Math.floor(Date.now() / 86400000);
  return TIPS[dayIndex % TIPS.length];
}

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="dashboard">
      <div className="dashboard-hero">
        <div className="dashboard-hero-icon" aria-hidden="true">
          <SymptomsIcon />
        </div>
        <h1>Welcome to ArogyaAI{user ? `, ${firstName(user.name)}` : ''}</h1>
        <p className="dashboard-sub">How can we help you today?</p>
        <p className="dashboard-tip">💡 {dailyTip()}</p>
      </div>

      <div className="card-grid">
        {SERVICES.map(({ path, ...rest }) =>
          rest.enabled ? (
            <Link key={path} to={path} className="service-card service-card--link">
              <CardBody {...rest} />
            </Link>
          ) : (
            <div key={path} className="service-card" aria-disabled="true">
              <CardBody {...rest} />
            </div>
          )
        )}
      </div>

      <Link to="/emergency" className="service-card service-card--link service-card--emergency">
        <span className="service-icon">
          <EmergencyIcon />
        </span>
        <h3>Emergency / SOS</h3>
        <p>Quick access to emergency services and contacts.</p>
        <span className="badge badge-emergency">Open</span>
      </Link>
    </div>
  );
}
