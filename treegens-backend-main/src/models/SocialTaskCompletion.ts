import mongoose, { type Model } from 'mongoose'

export type SocialTaskCompletionDoc = {
  walletAddress: string
  taskKey: string
  pointsEarned: number
}

/** Audit row: one per wallet per social task key (non-daily tasks). */
const socialTaskCompletionSchema = new mongoose.Schema(
  {
    walletAddress: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    taskKey: {
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

socialTaskCompletionSchema.index({ walletAddress: 1, taskKey: 1 }, {
  unique: true,
})

const SocialTaskCompletion: Model<SocialTaskCompletionDoc> =
  (mongoose.models.SocialTaskCompletion as
    | Model<SocialTaskCompletionDoc>
    | undefined) ||
  mongoose.model<SocialTaskCompletionDoc>(
    'SocialTaskCompletion',
    socialTaskCompletionSchema,
  )

export default SocialTaskCompletion
