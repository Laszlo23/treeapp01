import mongoose from 'mongoose'

const pushSubscriptionSchema = new mongoose.Schema(
  {
    walletAddress: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    endpoint: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
    userAgent: { type: String, required: false, maxlength: 512 },
  },
  { timestamps: true },
)

export default mongoose.model('PushSubscription', pushSubscriptionSchema)
