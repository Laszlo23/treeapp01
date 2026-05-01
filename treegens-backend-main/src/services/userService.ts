import {
  isSocialTaskKey,
  SOCIAL_TASK_CATALOG,
  type SocialTaskKey,
} from '../constants/socialRewardsCatalog'
import { enqueueNotification } from './notificationService'
import env from '../config/environment'
import BurnAggregate from '../models/BurnAggregate'
import DailyCheckIn from '../models/DailyCheckIn'
import SocialRewardTask from '../models/SocialRewardTask'
import SocialTaskCompletion from '../models/SocialTaskCompletion'
import Submission from '../models/Submission'
import User from '../models/User'
import VerifierWarning from '../models/VerifierWarning'

/** Seeded rows when `LEADERBOARD_DEMO_FALLBACK` + non-production + empty DB (page 1 only). */
const DEMO_TREES_PLANTED_LEADERBOARD: Array<{
  walletAddress: string
  name: string | undefined
  treesPlanted: number
  createdAt: Date
}> = [
  {
    walletAddress: '0xdemo000000000000000000000000000000000001',
    name: 'Mangrove Mia',
    treesPlanted: 220,
    createdAt: new Date('2025-06-01T12:00:00Z'),
  },
  {
    walletAddress: '0xdemo000000000000000000000000000000000002',
    name: 'Forest Felix',
    treesPlanted: 144,
    createdAt: new Date('2025-05-20T12:00:00Z'),
  },
  {
    walletAddress: '0xdemo000000000000000000000000000000000003',
    name: undefined,
    treesPlanted: 88,
    createdAt: new Date('2025-07-12T12:00:00Z'),
  },
]

const DEMO_TREES_FUNDED_LEADERBOARD: Array<{
  walletAddress: string
  totalBurnedMgroWei: string
  burnCount: number
  updatedAt: Date
}> = [
  {
    walletAddress: '0xdemo000000000000000000000000000000000001',
    totalBurnedMgroWei: '420000000000000000000',
    burnCount: 14,
    updatedAt: new Date('2025-08-01T12:00:00Z'),
  },
  {
    walletAddress: '0xdemo000000000000000000000000000000000004',
    totalBurnedMgroWei: '155000000000000000000',
    burnCount: 6,
    updatedAt: new Date('2025-07-28T12:00:00Z'),
  },
  {
    walletAddress: '0xdemo000000000000000000000000000000000005',
    totalBurnedMgroWei: '88000000000000000000',
    burnCount: 3,
    updatedAt: new Date('2025-06-15T12:00:00Z'),
  },
]

export type VerifierWarningBanner = {
  shouldShow: boolean
  warningCount: number
  messageVariant: 'first' | 'again'
  submissionId?: string
  submissionOwnerWalletAddress?: string
  healthCheckId?: string
  warnedAt?: string
}

export default class UserService {
  constructor() {
    // User service for managing user data
  }

  async getUserByWalletAddress(walletAddress: string) {
    // Normalize wallet address to lowercase for consistency
    const normalizedWalletAddress = walletAddress.toLowerCase()

    try {
      const user: any = await User.findOne({
        walletAddress: normalizedWalletAddress,
      }).lean()

      if (!user) {
        console.log('User not found for wallet address:', walletAddress)
        return null
      }

      return user
    } catch (error) {
      console.error('Error in getUserByWalletAddress:', error)
      throw error
    }
  }

  async getUserWithComputedTrees(walletAddress: string) {
    // Normalize wallet address to lowercase for consistency
    const normalizedWalletAddress = walletAddress.toLowerCase()

    try {
      const user = await User.findOne({
        walletAddress: normalizedWalletAddress,
      }).lean()

      if (!user) {
        console.log('User not found for wallet address:', walletAddress)
        return null
      }

      // Trees are credited on approval transition and persisted on User.
      return user
    } catch (error) {
      console.error('Error in getUserWithComputedTrees:', error)
      throw error
    }
  }

  async getTreesPlantedLeaderboard(
    page: number = 1,
    limit: number = 10,
  ): Promise<
    Array<{
      walletAddress: string
      name: string | undefined
      treesPlanted: number
      createdAt: Date
    }>
  > {
    const pageNum = Math.max(1, Math.floor(Number(page)) || 1)
    const limitRaw = Math.floor(Number(limit)) || 10
    const limitNum = Math.min(50, Math.max(1, limitRaw))
    const skip = (pageNum - 1) * limitNum

    try {
      const rows = await User.find({ treesPlanted: { $gt: 0 } })
        .sort({ treesPlanted: -1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .select({
          walletAddress: 1,
          name: 1,
          treesPlanted: 1,
          createdAt: 1,
          _id: 0,
        })
        .lean()

      if (
        rows.length === 0 &&
        env.LEADERBOARD_DEMO_FALLBACK &&
        !env.isProduction &&
        pageNum === 1
      ) {
        return DEMO_TREES_PLANTED_LEADERBOARD.slice(0, limitNum)
      }

      return rows.map(u => ({
        walletAddress: u.walletAddress,
        name: u.name,
        treesPlanted: u.treesPlanted ?? 0,
        createdAt: u.createdAt,
      }))
    } catch (error) {
      console.error('Error in getTreesPlantedLeaderboard:', error)
      throw error
    }
  }

  async getTreesFundedLeaderboard(
    page: number = 1,
    limit: number = 10,
  ): Promise<
    Array<{
      walletAddress: string
      totalBurnedMgroWei: string
      burnCount: number
      updatedAt: Date
    }>
  > {
    const pageNum = Math.max(1, Math.floor(Number(page)) || 1)
    const limitRaw = Math.floor(Number(limit)) || 10
    const limitNum = Math.min(50, Math.max(1, limitRaw))
    const skip = (pageNum - 1) * limitNum

    try {
      const rows = await BurnAggregate.aggregate<{
        walletAddress: string
        totalBurnedMgroWei: string
        burnCount: number
        updatedAt: Date
      }>([
        {
          $match: {
            totalBurnedMgroWei: { $ne: '0' },
          },
        },
        {
          $addFields: {
            burnedWeiLen: { $strLenCP: '$totalBurnedMgroWei' },
          },
        },
        {
          $sort: {
            burnedWeiLen: -1,
            totalBurnedMgroWei: -1,
            updatedAt: -1,
          },
        },
        { $skip: skip },
        { $limit: limitNum },
        {
          $project: {
            _id: 0,
            walletAddress: 1,
            totalBurnedMgroWei: 1,
            burnCount: 1,
            updatedAt: 1,
          },
        },
      ])

      if (
        rows.length === 0 &&
        env.LEADERBOARD_DEMO_FALLBACK &&
        !env.isProduction &&
        pageNum === 1
      ) {
        return DEMO_TREES_FUNDED_LEADERBOARD.slice(0, limitNum)
      }

      return rows
    } catch (error) {
      console.error('Error in getTreesFundedLeaderboard:', error)
      throw error
    }
  }

  private buildDemoPublicProfile(walletAddress: string): {
    user: {
      walletAddress: string
      name?: string
      treesPlanted?: number
      isVerifier?: boolean
      verifierSince?: Date
      createdAt: Date
      socialPointsTotal?: number
    }
    burns: {
      totalBurnedMgroWei: string
      burnCount: number
      updatedAt: Date
    } | null
    approvedSubmissionCount: number
  } | null {
    if (!env.LEADERBOARD_DEMO_FALLBACK || env.isProduction) return null
    const planted = DEMO_TREES_PLANTED_LEADERBOARD.find(
      d => d.walletAddress === walletAddress,
    )
    const funded = DEMO_TREES_FUNDED_LEADERBOARD.find(
      d => d.walletAddress === walletAddress,
    )
    if (!planted && !funded) return null
    const base =
      planted ??
      ({
        walletAddress: funded!.walletAddress,
        name: undefined as string | undefined,
        treesPlanted: 0,
        createdAt: funded!.updatedAt,
      } as const)
    return {
      user: {
        walletAddress: base.walletAddress,
        name: base.name,
        treesPlanted: base.treesPlanted,
        isVerifier: false,
        createdAt: base.createdAt,
        socialPointsTotal: 0,
      },
      burns: funded
        ? {
            totalBurnedMgroWei: funded.totalBurnedMgroWei,
            burnCount: funded.burnCount,
            updatedAt: funded.updatedAt,
          }
        : null,
      approvedSubmissionCount: 0,
    }
  }

  async getPublicProfile(walletAddressRaw: string): Promise<{
    user: {
      walletAddress: string
      name?: string
      treesPlanted?: number
      isVerifier?: boolean
      verifierSince?: Date
      createdAt: Date
      socialPointsTotal?: number
    }
    burns: {
      totalBurnedMgroWei: string
      burnCount: number
      updatedAt: Date
    } | null
    approvedSubmissionCount: number
  } | null> {
    const walletAddress = walletAddressRaw.trim().toLowerCase()
    const user = await User.findOne({ walletAddress })
      .select({
        walletAddress: 1,
        name: 1,
        treesPlanted: 1,
        isVerifier: 1,
        verifierSince: 1,
        createdAt: 1,
        socialPointsTotal: 1,
      })
      .lean()

    if (!user) {
      return this.buildDemoPublicProfile(walletAddress)
    }

    const burns = await BurnAggregate.findOne({ walletAddress })
      .select({
        totalBurnedMgroWei: 1,
        burnCount: 1,
        updatedAt: 1,
        _id: 0,
      })
      .lean()

    const approvedSubmissionCount = await Submission.countDocuments({
      userWalletAddress: walletAddress,
      status: 'approved',
    })

    return {
      user: {
        walletAddress: user.walletAddress,
        name: user.name,
        treesPlanted:
          typeof user.treesPlanted === 'number' ? user.treesPlanted : 0,
        isVerifier: Boolean(user.isVerifier),
        verifierSince: user.verifierSince,
        createdAt: user.createdAt,
        socialPointsTotal:
          typeof user.socialPointsTotal === 'number'
            ? user.socialPointsTotal
            : 0,
      },
      burns: burns
        ? {
            totalBurnedMgroWei: burns.totalBurnedMgroWei ?? '0',
            burnCount: burns.burnCount ?? 0,
            updatedAt: burns.updatedAt,
          }
        : null,
      approvedSubmissionCount,
    }
  }

  async updateUserProfile(
    walletAddress: string,
    updates: {
      name?: string
      phone?: string
      experience?: string
    },
  ) {
    const normalizedWalletAddress = walletAddress.toLowerCase()
    const sanitizedUpdates: {
      name?: string
      phone?: string
      experience?: string
    } = {}

    if (updates.name !== undefined) {
      sanitizedUpdates.name = updates.name
    }
    if (updates.phone !== undefined) {
      sanitizedUpdates.phone = updates.phone
    }
    if (updates.experience !== undefined) {
      sanitizedUpdates.experience = updates.experience
    }

    try {
      return await User.findOneAndUpdate(
        { walletAddress: normalizedWalletAddress },
        { $set: sanitizedUpdates },
        { new: true, runValidators: true },
      ).lean()
    } catch (error) {
      console.error('Error in updateUserProfile:', error)
      throw error
    }
  }

  async getVerifierWarningBanner(
    walletAddress: string,
  ): Promise<VerifierWarningBanner> {
    const normalizedWalletAddress = walletAddress.toLowerCase()
    const user = await User.findOne({
      walletAddress: normalizedWalletAddress,
    })
      .select({ isVerifier: 1, verifierWarningCount: 1 })
      .lean()

    if (!user || !user.isVerifier) {
      return {
        shouldShow: false,
        warningCount: 0,
        messageVariant: 'first',
      }
    }

    const warningCount = Number(user.verifierWarningCount || 0)
    if (warningCount <= 0) {
      return {
        shouldShow: false,
        warningCount: 0,
        messageVariant: 'first',
      }
    }

    const latestWarning = await VerifierWarning.findOne({
      walletAddress: normalizedWalletAddress,
      healthCheckId: { $exists: false },
      consumedBySlashAt: { $exists: false },
    })
      .sort({ createdAt: -1 })
      .lean()

    if (!latestWarning) {
      return {
        shouldShow: false,
        warningCount,
        messageVariant: warningCount >= 2 ? 'again' : 'first',
      }
    }

    const submission = await Submission.findById(latestWarning.submissionId)
      .select({ userWalletAddress: 1 })
      .lean()

    return {
      shouldShow: true,
      warningCount,
      messageVariant: warningCount >= 2 ? 'again' : 'first',
      submissionId: String(latestWarning.submissionId),
      submissionOwnerWalletAddress: submission?.userWalletAddress,
      healthCheckId: latestWarning.healthCheckId
        ? String(latestWarning.healthCheckId)
        : undefined,
      warnedAt: latestWarning.createdAt
        ? new Date(latestWarning.createdAt).toISOString()
        : undefined,
    }
  }

  private utcDayString(d: Date): string {
    return d.toISOString().slice(0, 10)
  }

  async getSocialRewardsSummary(walletAddress: string) {
    const normalizedWalletAddress = walletAddress.toLowerCase()
    const user: any = await User.findOne({
      walletAddress: normalizedWalletAddress,
    }).lean()
    if (!user) return null

    const done = new Map<string, Date>(
      (user.completedSocialTasks ?? []).map((t: { taskKey: string; completedAt: Date }) => [
        t.taskKey,
        t.completedAt,
      ]),
    )

    const todayUtc = this.utcDayString(new Date())
    const lastCheckinDay =
      user.lastCheckinAt != null
        ? this.utcDayString(new Date(user.lastCheckinAt))
        : null

    let dbRows: Array<{
      taskKey: string
      title: string
      description: string
    }> = []
    try {
      const rows = await SocialRewardTask.find({ active: true })
        .sort({ sortOrder: 1 })
        .lean()
        .exec()
      dbRows = rows as typeof dbRows
    } catch {
      dbRows = []
    }

    const orderedKeys: SocialTaskKey[] =
      dbRows.length > 0
        ? (dbRows
            .map(r => r.taskKey)
            .filter((k): k is SocialTaskKey => isSocialTaskKey(k)) as SocialTaskKey[])
        : (Object.keys(SOCIAL_TASK_CATALOG) as SocialTaskKey[])

    const tasks = orderedKeys.map(k => {
      let completed = done.has(k)
      let completedAt: string | null = done.has(k)
        ? new Date(done.get(k)!).toISOString()
        : null

      if (k === 'daily_checkin') {
        completed = lastCheckinDay === todayUtc
        completedAt =
          completed && user.lastCheckinAt
            ? new Date(user.lastCheckinAt).toISOString()
            : null
      }

      const dbMeta = dbRows.find(r => r.taskKey === k)
      const catalog = SOCIAL_TASK_CATALOG[k]

      return {
        taskKey: k,
        title: dbMeta?.title ?? catalog.title,
        description: dbMeta?.description ?? catalog.description,
        points: catalog.points,
        completed,
        completedAt,
      }
    })

    const catalogKeys = new Set(Object.keys(SOCIAL_TASK_CATALOG))
    const legacyTasks = (user.completedSocialTasks ?? [])
      .filter((t: { taskKey: string }) => !catalogKeys.has(t.taskKey))
      .map((t: { taskKey: string; completedAt: Date }) => ({
        taskKey: t.taskKey,
        title: 'Earlier quest',
        description:
          'This checklist entry was retired. Your loyalty points remain on your account.',
        points: 0,
        completed: true,
        completedAt: new Date(t.completedAt).toISOString(),
        retired: true as const,
      }))

    return {
      pointsTotal: typeof user.socialPointsTotal === 'number' ? user.socialPointsTotal : 0,
      tasks: [...tasks, ...legacyTasks],
    }
  }

  /**
   * Idempotent-ish: increments points once per task per user (honor system; pair with moderation).
   * `daily_checkin` resets each UTC day via `lastCheckinAt`.
   */
  async completeSocialTask(walletAddress: string, rawKey: string) {
    if (!isSocialTaskKey(rawKey))
      throw new Error('INVALID_TASK')

    const taskKey = rawKey
    const norm = walletAddress.toLowerCase()
    const pts = SOCIAL_TASK_CATALOG[taskKey].points

    if (taskKey === 'daily_checkin') {
      const user = await User.findOne({ walletAddress: norm })
      if (!user) return null

      const todayUtc = this.utcDayString(new Date())
      const lastDay =
        user.lastCheckinAt != null
          ? this.utcDayString(new Date(user.lastCheckinAt))
          : null

      if (lastDay === todayUtc) {
        const existing = await User.findOne({ walletAddress: norm }).lean()
        return existing
          ? { user: existing, newlyCompleted: false, pointsEarned: 0 }
          : null
      }

      const updated = await User.findOneAndUpdate(
        { walletAddress: norm },
        {
          $set: { lastCheckinAt: new Date() },
          $inc: { socialPointsTotal: pts },
        },
        { new: true, runValidators: true },
      ).lean()

      if (updated) {
        void DailyCheckIn.create({
          walletAddress: norm,
          utcDay: todayUtc,
          pointsEarned: pts,
        }).catch((e: { code?: number }) => {
          if (e?.code !== 11000) {
            console.warn('[userService] DailyCheckIn audit insert failed:', e)
          }
        })
        void enqueueNotification({
          recipientWalletAddress: norm,
          kind: 'social_reward',
          title: 'Daily check-in',
          body: `+${pts} loyalty points`,
          link: '/earn',
        }).catch(() => {})
        return { user: updated, newlyCompleted: true, pointsEarned: pts }
      }
      return null
    }

    const updated = await User.findOneAndUpdate(
      {
        walletAddress: norm,
        completedSocialTasks: { $not: { $elemMatch: { taskKey } } },
      },
      {
        $inc: { socialPointsTotal: pts },
        $push: {
          completedSocialTasks: {
            taskKey,
            completedAt: new Date(),
          },
        },
      },
      { new: true, runValidators: true },
    ).lean()

    if (updated) {
      void SocialTaskCompletion.create({
        walletAddress: norm,
        taskKey,
        pointsEarned: pts,
      }).catch((e: { code?: number }) => {
        if (e?.code !== 11000) {
          console.warn(
            '[userService] SocialTaskCompletion audit insert failed:',
            e,
          )
        }
      })
      void enqueueNotification({
        recipientWalletAddress: norm,
        kind: 'social_reward',
        title: 'Quest complete',
        body: `+${pts} loyalty points`,
        link: '/earn',
      }).catch(() => {})
      return { user: updated, newlyCompleted: true, pointsEarned: pts }
    }

    const existing = await User.findOne({ walletAddress: norm }).lean()
    return existing
      ? { user: existing, newlyCompleted: false, pointsEarned: 0 }
      : null
  }

  async setVerifierDelegate(walletAddress: string, delegateWalletRaw: string) {
    const from = walletAddress.toLowerCase()
    const delegateWallet = delegateWalletRaw.trim().toLowerCase()
    if (!delegateWallet) throw new Error('INVALID_DELEGATE')
    if (delegateWallet === from) throw new Error('CANNOT_DELEGATE_SELF')

    const target = await User.findOne({ walletAddress: delegateWallet }).lean()
    if (!target?.isVerifier) throw new Error('TARGET_NOT_VERIFIER')

    await User.findOneAndUpdate(
      { walletAddress: from },
      {
        $set: {
          verifierDelegate: delegateWallet,
          verifierDelegateSetAt: new Date(),
        },
      },
      { new: true },
    )

    return User.findOne({ walletAddress: from }).lean()
  }

  async clearVerifierDelegate(walletAddress: string) {
    await User.updateOne(
      { walletAddress: walletAddress.toLowerCase() },
      { $set: { verifierDelegate: null, verifierDelegateSetAt: null } },
    )
  }

  async listDelegatorsForVerifier(verifierWallet: string) {
    const norm = verifierWallet.toLowerCase()
    return User.find({ verifierDelegate: norm })
      .select({ walletAddress: 1, name: 1, verifierDelegateSetAt: 1 })
      .lean()
  }
}
