import { useRef, useState, type ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import PageHeader from '../components/PageHeader';

type Extracted = {
  looksLikePrescription: boolean;
  medicineNames: string[];
  dosage: string;
  frequency: string;
  instructions: string;
  doctorOrHospitalInfo: string;
  readError?: string;
};

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024;

export default function Prescription() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<Extracted | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    setError('');
    setResult(null);
    const selected = e.target.files?.[0] || null;

    if (!selected) {
      setFile(null);
      setPreviewUrl(null);
      return;
    }
    if (!ALLOWED_TYPES.includes(selected.type)) {
      setError('Please upload a JPEG, PNG, or WEBP image.');
      setFile(null);
      setPreviewUrl(null);
      return;
    }
    if (selected.size > MAX_BYTES) {
      setError('Image is too large. Please upload a file under 5MB.');
      setFile(null);
      setPreviewUrl(null);
      return;
    }

    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
  }

  async function handleAnalyze() {
    if (!file || loading) return;
    setError('');
    setLoading(true);
    try {
      const form = new FormData();
      form.append('image', file);
      const res = await api<{ extracted: Extracted }>('/prescriptions/analyze', {
        method: 'POST',
        body: form,
        auth: true,
      });
      setResult(res.extracted);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'The image could not be read. Please upload a clearer image.'
      );
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setFile(null);
    setPreviewUrl(null);
    setResult(null);
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  return (
    <div className="content-narrow">
      <PageHeader
        title="Prescription Reader"
        subtitle="Upload a photo of a prescription or medicine label to extract the text on it."
      />

      {!result && (
        <div className="panel">
          {error && <div className="alert alert-error">{error}</div>}

          <label className="field-label" htmlFor="rx-image">
            Prescription image
          </label>
          <input
            id="rx-image"
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
          />

          {previewUrl && (
            <img src={previewUrl} alt="Prescription preview" className="rx-preview" />
          )}

          <button
            className="btn btn-primary btn-block rx-analyze-btn"
            disabled={!file || loading}
            onClick={handleAnalyze}
            type="button"
          >
            {loading ? 'Analyzing prescription...' : 'Analyze Prescription'}
          </button>
        </div>
      )}

      {result && (
        <div className="panel">
          <h2 className="result-heading">Information Detected From Uploaded Image</h2>

          {result.readError ? (
            <div className="alert alert-error">{result.readError}</div>
          ) : (
            <>
              <h3 className="result-heading">Medicine</h3>
              <p>
                {result.medicineNames.length > 0
                  ? result.medicineNames.join(', ')
                  : 'Text unclear / unable to confidently read.'}
              </p>

              <h3 className="result-heading">Dosage</h3>
              <p>{result.dosage}</p>

              <h3 className="result-heading">Frequency</h3>
              <p>{result.frequency}</p>

              <h3 className="result-heading">Instructions</h3>
              <p>{result.instructions}</p>

              <h3 className="result-heading">Doctor / Hospital</h3>
              <p>{result.doctorOrHospitalInfo}</p>
            </>
          )}

          <div className="alert alert-info">
            This is automated text extraction only, not medical advice. Always
            confirm details against the original prescription or with your
            pharmacist.
          </div>

          <div className="action-row">
            <Link to="/medicines" className="btn btn-primary">
              Medicine Guidance
            </Link>
            <button className="btn btn-ghost" onClick={reset} type="button">
              Upload Another
            </button>
            <Link to="/dashboard" className="btn btn-ghost">
              Back to Dashboard
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
