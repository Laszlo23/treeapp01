import mongoose from 'mongoose'

const burnAggregateSchema = new mongoose.Schema(
  {
    walletAddress: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    /** Cumulative MGRO burned by this wallet (wei, decimal string). */
    totalBurnedMgroWei: {
      type: String,
      required: true,
      default: '0',
    },
    burnCount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true },
)

burnAggregateSchema.index({ updatedAt: -1 })

export default mongoose.model('BurnAggregate', burnAggregateSchema)
