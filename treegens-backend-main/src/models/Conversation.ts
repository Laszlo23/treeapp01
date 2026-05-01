import mongoose from 'mongoose'

const conversationSchema = new mongoose.Schema(
  {
    submissionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Submission',
      required: true,
      unique: true,
      index: true,
    },
    participants: {
      type: [{ type: String, lowercase: true, trim: true }],
      default: [],
    },
    lastMessageAt: { type: Date, default: Date.now },
    lastMessagePreview: { type: String, default: '', maxlength: 280 },
  },
  { timestamps: true },
)

conversationSchema.index({ participants: 1, lastMessageAt: -1 })

export default mongoose.model('Conversation', conversationSchema)
