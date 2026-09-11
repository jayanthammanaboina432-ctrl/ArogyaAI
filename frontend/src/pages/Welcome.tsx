import { Link } from 'react-router-dom';

export default function Welcome() {
  return (
    <div className="welcome">
      <h1>ArogyaAI</h1>
      <p className="tagline">
        An AI-based healthcare system for diagnosis and patient care.
      </p>
      <p className="welcome-copy">
        Symptom analysis, preliminary AI assessment, medicine information,
        city-based hospital and pharmacy search, an AI healthcare chatbot,
        prescription reading, and emergency support — in one simple interface.
      </p>
      <div className="welcome-actions">
        <Link to="/register" className="btn btn-primary btn-lg">
          Get Started
        </Link>
        <Link to="/login" className="btn btn-ghost btn-lg">
          I already have an account
        </Link>
      </div>
    </div>
  );
}
