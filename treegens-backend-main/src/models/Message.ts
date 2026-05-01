import mongoose from 'mongoose'

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    senderWalletAddress: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    body: { type: String, required: true, maxlength: 4000 },
    readBy: {
      type: [{ type: String, lowercase: true, trim: true }],
      default: [],
    },
  },
  { timestamps: true },
)

messageSchema.index({ conversationId: 1, createdAt: 1 })

export default mongoose.model('Message', messageSchema)
