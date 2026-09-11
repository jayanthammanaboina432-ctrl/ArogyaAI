import { useState, type FormEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../api/client';
import PageHeader from '../components/PageHeader';

type PlaceType = 'hospital' | 'pharmacy' | 'all';

type Place = {
  id: string;
  name: string;
  type: 'hospital' | 'pharmacy';
  city: string;
  address: string;
  phone: string;
  openStatus: 'Open' | 'Closed';
};

type SearchResponse = { city: string; type: PlaceType; count: number; results: Place[] };

function telHref(phone: string) {
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}

// No origin is set on purpose: Google Maps then defaults to "Your location"
// and asks the visitor to allow/enter it themselves — no API key, no
// geolocation permission needed inside our own app.
function directionsHref(place: Place) {
  const destination = encodeURIComponent(`${place.name}, ${place.address || place.city}`);
  return `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`;
}

export default function HealthcareFinder() {
  const location = useLocation();
  const initialCity = (location.state as { city?: string } | null)?.city || '';

  const [city, setCity] = useState(initialCity);
  const [type, setType] = useState<PlaceType>('all');
  const [results, setResults] = useState<Place[] | null>(null);
  const [searchedCity, setSearchedCity] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError('');

    const trimmedCity = city.trim();
    if (!trimmedCity) {
      setError('Please enter a city to search.');
      return;
    }

    setLoading(true);
    setResults(null);
    try {
      const params = new URLSearchParams({ city: trimmedCity, type });
      const res = await api<SearchResponse>(`/healthcare/search?${params.toString()}`, {
        auth: true,
      });
      setResults(res.results);
      setSearchedCity(res.city);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not search hospitals or pharmacies.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="content-narrow">
      <PageHeader
        title="Hospital & Pharmacy Finder"
        subtitle="Enter a city to find hospitals and pharmacies near you."
      />

      <form className="panel" onSubmit={handleSubmit} noValidate>
        {error && <div className="alert alert-error">{error}</div>}

        <label className="field-label" htmlFor="city">
          Enter City
        </label>
        <input
          id="city"
          type="text"
          placeholder="e.g. Hyderabad"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          maxLength={80}
        />

        <fieldset className="type-choice">
          <legend className="field-label">Select</legend>
          {(
            [
              ['hospital', 'Hospitals'],
              ['pharmacy', 'Pharmacies'],
              ['all', 'All'],
            ] as [PlaceType, string][]
          ).map(([value, label]) => (
            <label key={value} className="radio-option">
              <input
                type="radio"
                name="type"
                value={value}
                checked={type === value}
                onChange={() => setType(value)}
              />
              {label}
            </label>
          ))}
        </fieldset>

        <button className="btn btn-primary btn-block" disabled={loading}>
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {results && (
        <div className="results-section">
          {results.length === 0 ? (
            <div className="panel">
              <p className="no-results">
                No hospitals or pharmacies found for "{searchedCity}".
              </p>
            </div>
          ) : (
            <div className="place-grid">
              {results.map((place) => (
                <div key={place.id} className="place-card">
                  <div className="place-card-head">
                    <h3>{place.name}</h3>
                    <span
                      className={
                        place.openStatus === 'Open'
                          ? 'status-pill status-open'
                          : 'status-pill status-closed'
                      }
                    >
                      {place.openStatus}
                    </span>
                  </div>
                  <p className="place-meta">
                    <strong>City:</strong> {place.city}
                  </p>
                  {place.address && (
                    <p className="place-meta">
                      <strong>Address:</strong> {place.address}
                    </p>
                  )}
                  {place.phone && (
                    <p className="place-meta">
                      <strong>Phone:</strong> {place.phone}
                    </p>
                  )}

                  {place.type === 'pharmacy' && (
                    <p className="fine-print place-note">
                      Please contact the pharmacy to confirm medicine availability.
                    </p>
                  )}

                  <div className="place-actions">
                    {place.phone ? (
                      <a href={telHref(place.phone)} className="btn btn-primary">
                        {place.type === 'pharmacy' ? 'Call Pharmacy' : 'Call'}
                      </a>
                    ) : (
                      <span className="fine-print">No phone number on file.</span>
                    )}
                    <a
                      href={directionsHref(place)}
                      className="btn btn-ghost"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Directions
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
