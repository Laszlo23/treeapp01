import mongoose from 'mongoose'

const userSchema = new mongoose.Schema(
  {
    walletAddress: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: false,
      trim: true,
      maxlength: 100,
    },
    ensName: {
      type: String,
      required: false,
      trim: true,
      maxlength: 100,
    },
    phone: {
      type: String,
      required: false,
      trim: true,
    },
    experience: {
      type: String,
      required: false,
      trim: true,
      maxlength: 500,
    },
    // Authentication fields
    email: {
      type: String,
      required: false,
      trim: true,
      maxlength: 200,
    },
    authProvider: {
      type: String,
      required: false,
      enum: ['wallet', 'gmail'],
      default: 'wallet',
    },
    currentToken: {
      type: String,
      required: false,
    },
    tokenExpiration: {
      type: Date,
      required: false,
    },
    lastLoginAt: {
      type: Date,
      required: false,
    },
    // Future extensible fields
    treesPlanted: {
      type: Number,
      required: false,
      default: 0,
      min: 0,
    },
    tokensClaimed: {
      type: String,
      required: false,
      default: '0',
    },
    // Verifier fields
    isVerifier: {
      type: Boolean,
      required: false,
      default: false,
      index: true,
    },
    verifierSince: {
      type: Date,
      required: false,
    },
    verifierWarningCount: {
      type: Number,
      required: false,
      default: 0,
      min: 0,
    },
    verifierSlashCount: {
      type: Number,
      required: false,
      default: 0,
      min: 0,
    },
    lastSlashedAt: {
      type: Date,
      required: false,
    },
    /** Loyalty points for social tasks; convertible to TGN distributions off-chain/on-chain elsewhere */
    socialPointsTotal: {
      type: Number,
      required: false,
      default: 0,
      min: 0,
    },
    completedSocialTasks: [
      {
        taskKey: { type: String, required: true, trim: true },
        completedAt: { type: Date, required: true },
      },
    ],
    /** UTC instant of last `daily_checkin` completion (repeatable once per UTC day). */
    lastCheckinAt: {
      type: Date,
      required: false,
    },
    /** Off-chain stake delegation: verifier wallet receiving proxy vote credit from this user. */
    verifierDelegate: {
      type: String,
      lowercase: true,
      default: null,
      index: true,
    },
    verifierDelegateSetAt: {
      type: Date,
      required: false,
    },
  },
  {
    timestamps: true,
  },
)

userSchema.index({ createdAt: -1 })

export default mongoose.model('User', userSchema)
