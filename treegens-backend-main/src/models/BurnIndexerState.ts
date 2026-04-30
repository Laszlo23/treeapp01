import mongoose from 'mongoose'

const burnIndexerStateSchema = new mongoose.Schema(
  {
    contractAddress: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    lastProcessedBlock: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { timestamps: true },
)

burnIndexerStateSchema.index({ contractAddress: 1 }, { unique: true })

export default mongoose.model('BurnIndexerState', burnIndexerStateSchema)
