import mongoose from 'mongoose';

const healthcarePlaceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      required: true,
      enum: ['hospital', 'pharmacy'],
    },
    city: { type: String, required: true, trim: true },
    // Lowercased, trimmed copy of `city` used for case-insensitive lookups.
    cityKey: { type: String, required: true, index: true },
    address: { type: String, trim: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    openStatus: {
      type: String,
      enum: ['Open', 'Closed'],
      default: 'Open',
    },
  },
  { timestamps: true }
);

healthcarePlaceSchema.pre('validate', function normalizeCityKey() {
  if (this.city) {
    this.cityKey = this.city.trim().toLowerCase();
  }
});

// Supports: search by city alone, and by city + type.
healthcarePlaceSchema.index({ cityKey: 1, type: 1 });

export const HealthcarePlace = mongoose.model('HealthcarePlace', healthcarePlaceSchema);
