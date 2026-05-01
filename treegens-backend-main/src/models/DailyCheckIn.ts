import mongoose, { type Model } from 'mongoose'

export type DailyCheckInDoc = {
  walletAddress: string
  utcDay: string
  pointsEarned: number
}

/** Audit row: one per wallet per UTC calendar day when daily_checkin succeeds. */
const dailyCheckInSchema = new mongoose.Schema(
  {
    walletAddress: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    utcDay: {
      type: String,
      required: true,
      trim: true,
    },
    pointsEarned: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { timestamps: true },
)

dailyCheckInSchema.index({ walletAddress: 1, utcDay: 1 }, { unique: true })

const DailyCheckIn: Model<DailyCheckInDoc> =
  (mongoose.models.DailyCheckIn as Model<DailyCheckInDoc> | undefined) ||
  mongoose.model<DailyCheckInDoc>('DailyCheckIn', dailyCheckInSchema)

export default DailyCheckIn
