import mongoose from 'mongoose'

const gpsSchema = new mongoose.Schema(
  {
    latitude: { type: Number, required: true, min: -90, max: 90 },
    longitude: { type: Number, required: true, min: -180, max: 180 },
  },
  { _id: false },
)

const clipSchema = new mongoose.Schema(
  {
    uploaded: { type: Boolean, default: false },
    originalFilename: { type: String, required: false },
    mimeType: { type: String, required: false },
    sizeBytes: { type: Number, min: 0, required: false },
    videoCID: { type: String, required: false },
    publicUrl: { type: String, required: false },
    gpsCoordinates: { type: gpsSchema, required: false },
    reverseGeocode: { type: String, required: false },
    uploadedAt: { type: Date, required: false },
    version: { type: Number, default: 1, min: 1 },
  },
  { _id: false },
)

const voteSchema = new mongoose.Schema(
  {
    voterWalletAddress: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    vote: { type: String, enum: ['yes', 'no'], required: true },
    reasons: { type: [String], default: [] },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
)

const gpsSnapshotSchema = new mongoose.Schema(
  {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
  },
  { _id: false },
)

const aiVerificationSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ['skipped', 'processing', 'completed', 'failed'],
      required: true,
    },
    provider: {
      type: String,
      default: 'buildingculture',
    },
    countedMangroves: { type: Number, min: 0, required: false },
    confidence: { type: Number, min: 0, max: 1, required: false },
    verifiedAt: { type: Date, required: false },
    /** Why AI was not run or outcome routing */
    decision: {
      type: String,
      enum: ['auto_approved', 'pending_verifier', 'skipped', 'ai_failed'],
      required: false,
    },
    error: { type: String, required: false },
    skipReason: { type: String, required: false },
    /** Serialized AI JSON (truncated server-side when large) */
    rawResponse: { type: String, required: false },
    walletAddress: {
      type: String,
      lowercase: true,
      trim: true,
      required: false,
    },
    gpsCoordinates: { type: gpsSnapshotSchema, required: false },
    declaredTreesPlanted: { type: Number, min: 0, required: false },
    autoApproveThreshold: {
      minConfidence: { type: Number, required: false },
      maxCountDelta: { type: Number, required: false },
    },
  },
  { _id: false },
)

const submissionSchema = new mongoose.Schema(
  {
    userWalletAddress: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    status: {
      type: String,
      enum: [
        'draft',
        'awaiting_plant',
        'pending_review',
        'approved',
        'rejected',
      ],
      default: 'draft',
      index: true,
    },
    reviewedAt: { type: Date, required: false, index: true },
    land: { type: clipSchema, default: () => ({ uploaded: false }) },
    plant: { type: clipSchema, default: () => ({ uploaded: false }) },
    treesPlanted: { type: Number, min: 0, required: false },
    /** Cumulative MGRO wei minted to planter for this submission; mirrors RewardAllocation.planterCumulativePaidWei. */
    planterRewardClaimedWei: { type: String, default: '0' },
    treeType: { type: String, required: false },
    votes: { type: [voteSchema], default: [] },
    aiVerification: { type: aiVerificationSchema, required: false },
  },
  { timestamps: true },
)

submissionSchema.index({ userWalletAddress: 1, createdAt: -1 })
submissionSchema.index({ status: 1, updatedAt: -1 })
submissionSchema.index({ 'votes.voterWalletAddress': 1 })
submissionSchema.index({ 'land.videoCID': 1 }, { unique: true, sparse: true })
submissionSchema.index({ 'plant.videoCID': 1 }, { unique: true, sparse: true })
submissionSchema.index({ 'aiVerification.status': 1 }, { sparse: true })

export default mongoose.model('Submission', submissionSchema)
