import mongoose from 'mongoose'

const notificationSchema = new mongoose.Schema(
  {
    recipientWalletAddress: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    kind: {
      type: String,
      required: true,
      trim: true,
      maxlength: 64,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    body: { type: String, required: true, trim: true, maxlength: 2000 },
    link: { type: String, required: false, trim: true, maxlength: 2048 },
    payload: { type: mongoose.Schema.Types.Mixed, required: false },
    isRead: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
)

notificationSchema.index({ recipientWalletAddress: 1, createdAt: -1 })

export default mongoose.model('Notification', notificationSchema)
