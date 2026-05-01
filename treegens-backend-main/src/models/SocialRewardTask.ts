import mongoose, { type Model } from 'mongoose'

export type SocialRewardTaskDoc = {
  taskKey: string
  title: string
  description: string
  points: number
  sortOrder: number
  active: boolean
}

/** Canonical task definitions synced from code catalog into MongoDB for ordering and ops visibility. */
const socialRewardTaskSchema = new mongoose.Schema(
  {
    taskKey: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    title: { type: String, required: true },
    description: { type: String, required: true },
    /** Mirror of catalog; points awarded still use `SOCIAL_TASK_CATALOG` in userService for tamper resistance. */
    points: { type: Number, required: true, min: 0 },
    sortOrder: { type: Number, required: true, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
)

socialRewardTaskSchema.index({ active: 1, sortOrder: 1 })

const SocialRewardTask: Model<SocialRewardTaskDoc> =
  (mongoose.models.SocialRewardTask as Model<SocialRewardTaskDoc> | undefined) ||
  mongoose.model<SocialRewardTaskDoc>('SocialRewardTask', socialRewardTaskSchema)

export default SocialRewardTask
