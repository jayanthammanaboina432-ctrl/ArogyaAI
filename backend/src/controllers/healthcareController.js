import { HealthcarePlace } from '../models/HealthcarePlace.js';
import { AppError } from '../middleware/errorHandler.js';

const VALID_TYPES = ['hospital', 'pharmacy', 'all'];

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function toCard(doc) {
  return {
    id: doc._id.toString(),
    name: doc.name,
    type: doc.type,
    city: doc.city,
    address: doc.address,
    phone: doc.phone,
    openStatus: doc.openStatus,
  };
}

export async function search(req, res, next) {
  try {
    const city = (req.query.city || '').toString().trim();
    const type = (req.query.type || 'all').toString().trim().toLowerCase();

    if (!city) {
      throw new AppError(400, 'Please enter a city to search.');
    }
    if (!VALID_TYPES.includes(type)) {
      throw new AppError(400, 'Please select Hospitals, Pharmacies, or All.');
    }

    // Match the city itself, or a locality/area named in the address
    // (e.g. searching "Uppal" or "Gachibowli" should still find nearby
    // Hyderabad hospitals/pharmacies, since those are areas, not cities).
    const pattern = new RegExp(escapeRegExp(city), 'i');
    const filter = {
      $or: [{ cityKey: city.toLowerCase() }, { address: pattern }],
    };
    if (type !== 'all') {
      filter.type = type;
    }

    const results = await HealthcarePlace.find(filter).sort({ name: 1 }).lean();

    res.json({
      city,
      type,
      count: results.length,
      results: results.map((doc) => ({
        id: doc._id.toString(),
        name: doc.name,
        type: doc.type,
        city: doc.city,
        address: doc.address,
        phone: doc.phone,
        openStatus: doc.openStatus,
      })),
    });
  } catch (err) {
    next(err);
  }
}

export async function getById(req, res, next) {
  try {
    const doc = await HealthcarePlace.findById(req.params.id);
    if (!doc) {
      throw new AppError(404, 'This hospital or pharmacy could not be found.');
    }
    res.json({ place: toCard(doc) });
  } catch (err) {
    if (err.name === 'CastError') {
      return next(new AppError(404, 'This hospital or pharmacy could not be found.'));
    }
    next(err);
  }
}
