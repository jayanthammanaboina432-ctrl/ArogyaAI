import { useEffect, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import PageHeader from '../components/PageHeader';

type MedicineEntry = {
  genericName: string;
  commonBrandNames: string;
  purpose: string;
  precautions: string;
};

type MedicineResult = {
  recognized: boolean;
  conditionName: string;
  overview: string;
  commonMedicines: MedicineEntry[];
  whenToSeeADoctor: string;
  disclaimer: string;
};

export default function Medicines() {
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('query') || '');
  const [result, setResult] = useState<MedicineResult | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function runSearch(term: string) {
    if (loading) return;
    setError('');

    const trimmed = term.trim();
    if (!trimmed) {
      setError('Please enter a symptom or condition to search.');
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const res = await api<{ result: MedicineResult }>(
        `/medicines/search?query=${encodeURIComponent(trimmed)}`,
        { auth: true }
      );
      setResult(res.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load medicine information.');
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    runSearch(query);
  }

  // Arriving from the symptom result page ("Medicine Guidance" button) —
  // pre-fill and auto-run the search for that condition.
  useEffect(() => {
    const initial = searchParams.get('query');
    if (initial && initial.trim()) {
      runSearch(initial);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="content-narrow">
      <PageHeader
        title="Medicine Guidance"
        subtitle="Enter a symptom or condition to see medicines commonly used for it. This is general information, not a prescription."
      />

      <form className="panel" onSubmit={handleSubmit} noValidate>
        {error && <div className="alert alert-error">{error}</div>}
        <label className="field-label" htmlFor="medicine">
          Symptom or condition
        </label>
        <div className="inline-form">
          <input
            id="medicine"
            type="text"
            placeholder="e.g. Fever, headache, cold"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            maxLength={100}
          />
          <button className="btn btn-primary" disabled={loading}>
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </form>

      {result && (
        <div className="panel">
          <h2 className="result-condition">{result.conditionName}</h2>

          {!result.recognized ? (
            <div className="alert alert-warning">{result.overview}</div>
          ) : (
            <>
              <p>{result.overview}</p>

              {result.commonMedicines.length > 0 && (
                <>
                  <h3 className="result-heading">Commonly Used Medicines</h3>
                  <div className="medicine-list">
                    {result.commonMedicines.map((m) => (
                      <div className="medicine-item" key={m.genericName}>
                        <div className="medicine-item-head">
                          <span className="medicine-name">{m.genericName}</span>
                          {m.commonBrandNames && (
                            <span className="medicine-brands">{m.commonBrandNames}</span>
                          )}
                        </div>
                        <p className="medicine-purpose">{m.purpose}</p>
                        <p className="medicine-precautions">
                          <strong>Precautions:</strong> {m.precautions}
                        </p>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <h3 className="result-heading">When to See a Doctor</h3>
              <p>{result.whenToSeeADoctor}</p>

              <div className="alert alert-info">{result.disclaimer}</div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
