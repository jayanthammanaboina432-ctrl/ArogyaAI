import { Link } from 'react-router-dom';

export default function PageHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="page-header">
      <Link to="/dashboard" className="back-link">
        &larr; Back to Dashboard
      </Link>
      <h1>{title}</h1>
      {subtitle && <p className="page-subtitle">{subtitle}</p>}
    </div>
  );
}
