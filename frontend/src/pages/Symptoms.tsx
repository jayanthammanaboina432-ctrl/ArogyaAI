import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import PageHeader from '../components/PageHeader';
import type { Assessment } from './SymptomsResult';

export default function Symptoms() {
  const navigate = useNavigate();
  const [symptoms, setSymptoms] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError('');

    const trimmed = symptoms.trim();
    if (!trimmed) {
      setError('Please enter at least one symptom.');
      return;
    }

    setSubmitting(true);
    try {
      const { assessment } = await api<{ assessment: Assessment }>(
        '/symptoms/analyze',
        { method: 'POST', body: { symptoms: trimmed }, auth: true }
      );
      navigate('/symptoms/result', { state: { assessment, symptoms: trimmed } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not analyze symptoms.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="content-narrow">
      <PageHeader
        title="Check Your Symptoms"
        subtitle="Describe how you feel in your own words. This gives a preliminary, non-diagnostic assessment."
      />

      <form className="panel" onSubmit={handleSubmit} noValidate>
        {error && <div className="alert alert-error">{error}</div>}

        <label className="field-label" htmlFor="symptoms">
          Enter your symptoms
        </label>
        <textarea
          id="symptoms"
          rows={4}
          placeholder="e.g. Fever, cough, headache and body pain"
          value={symptoms}
          onChange={(e) => setSymptoms(e.target.value)}
          maxLength={1000}
        />

        <button className="btn btn-primary btn-block" disabled={submitting}>
          {submitting ? 'Analyzing symptoms...' : 'Analyze Symptoms'}
        </button>
      </form>

      <p className="fine-print">
        ArogyaAI provides preliminary healthcare assistance and general
        information. It does not replace a qualified healthcare professional or
        provide a confirmed diagnosis.
      </p>
    </div>
  );
}
