import mongoose from 'mongoose';

const prescriptionRecordSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // Reference only — the uploaded image itself is not persisted.
    fileReference: { type: String, required: true },
    extractedText: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const PrescriptionRecord = mongoose.model('PrescriptionRecord', prescriptionRecordSchema);
