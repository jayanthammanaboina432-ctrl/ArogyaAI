import mongoose from 'mongoose';

const symptomRecordSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    symptomsText: { type: String, required: true },
    prediction: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const SymptomRecord = mongoose.model('SymptomRecord', symptomRecordSchema);
