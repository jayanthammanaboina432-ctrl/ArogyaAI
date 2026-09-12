import { Link, Navigate, useLocation } from 'react-router-dom';
import PageHeader from '../components/PageHeader';

export type Assessment = {
  offTopic?: boolean;
  possibleCondition: string;
  symptomsConsidered: string[];
  generalGuidance: string;
  urgencyNote: string;
  disclaimer: string;
};

type LocationState = { assessment?: Assessment; symptoms?: string };

export default function SymptomsResult() {
  const location = useLocation();
  const state = (location.state || {}) as LocationState;

  if (!state.assessment) {
    return <Navigate to="/symptoms" replace />;
  }

  const a = state.assessment;

  return (
    <div className="content-narrow">
      <PageHeader title="Preliminary AI Assessment" />

      <div className="panel">
        {a.offTopic ? (
          <div className="alert alert-warning">{a.generalGuidance}</div>
        ) : (
          <>
            <h2 className="result-heading">Possible Condition</h2>
            <p className="result-condition">{a.possibleCondition}</p>

            <h2 className="result-heading">Symptoms Considered</h2>
            <ul className="result-list">
              {a.symptomsConsidered.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>

            <h2 className="result-heading">General Guidance</h2>
            <p>{a.generalGuidance}</p>

            <div className="alert alert-warning">{a.urgencyNote}</div>

            <div className="alert alert-info">
              <strong>Important:</strong> {a.disclaimer}
            </div>
          </>
        )}
      </div>

      {!a.offTopic && (
        <div className="action-row">
          <Link
            to={`/medicines?query=${encodeURIComponent(a.possibleCondition)}`}
            className="btn btn-primary"
          >
            Medicine Guidance
          </Link>
          <Link to="/healthcare-finder" className="btn btn-ghost">
            Find Hospital / Pharmacy
          </Link>
          <Link to="/chat" className="btn btn-ghost">
            Ask AI Chatbot
          </Link>
          <Link to="/dashboard" className="btn btn-ghost">
            Back to Dashboard
          </Link>
        </div>
      )}

      <Link to="/symptoms" className="btn btn-ghost btn-block check-another-btn">
        Check Another Symptom
      </Link>
    </div>
  );
}
