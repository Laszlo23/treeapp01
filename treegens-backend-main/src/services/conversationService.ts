import mongoose from 'mongoose'
import Conversation from '../models/Conversation'
import Message from '../models/Message'
import Submission from '../models/Submission'
import User from '../models/User'
import { enqueueNotification } from './notificationService'

async function assertSubmissionAccess(
  submissionId: string,
  wallet: string,
): Promise<{ submission: any; isVerifier: boolean }> {
  if (!mongoose.Types.ObjectId.isValid(submissionId)) {
    throw new Error('Invalid submissionId')
  }
  const submission = await Submission.findById(submissionId)
  if (!submission) throw new Error('Submission not found')

  const owner = String(submission.userWalletAddress || '').toLowerCase()
  const w = wallet.toLowerCase()
  const user = await User.findOne({ walletAddress: w }).lean()
  const isVerifier = Boolean(user?.isVerifier)

  if (owner !== w && !isVerifier) {
    throw new Error('Access denied')
  }

  return { submission, isVerifier }
}

export async function getOrCreateConversation(submissionId: string, wallet: string) {
  await assertSubmissionAccess(submissionId, wallet)
  const owner = (
    await Submission.findById(submissionId).select({ userWalletAddress: 1 }).lean()
  )?.userWalletAddress
  const ownerNorm = String(owner || '').toLowerCase()
  const w = wallet.toLowerCase()

  let conv = await Conversation.findOne({
    submissionId: new mongoose.Types.ObjectId(submissionId),
  })

  if (!conv) {
    conv = await Conversation.create({
      submissionId: new mongoose.Types.ObjectId(submissionId),
      participants: [ownerNorm],
      lastMessageAt: new Date(),
      lastMessagePreview: '',
    })
  }

  if (!conv.participants.map(p => p.toLowerCase()).includes(w)) {
    await Conversation.updateOne(
      { _id: conv._id },
      { $addToSet: { participants: w } },
    )
    conv = await Conversation.findById(conv._id)
    if (!conv) throw new Error('Conversation missing')
  }

  const messages = await Message.find({ conversationId: conv._id })
    .sort({ createdAt: 1 })
    .limit(200)
    .lean()

  return { conversation: conv, messages }
}

export async function postMessage(submissionId: string, senderWallet: string, body: string) {
  await assertSubmissionAccess(submissionId, senderWallet)
  const trimmed = String(body || '').trim().slice(0, 4000)
  if (!trimmed) throw new Error('Message body required')

  const { conversation } = await getOrCreateConversation(submissionId, senderWallet)
  const convId = conversation!._id as mongoose.Types.ObjectId
  const sender = senderWallet.toLowerCase()

  const msg = await Message.create({
    conversationId: convId,
    senderWalletAddress: sender,
    body: trimmed,
    readBy: [sender],
  })

  await Conversation.updateOne(
    { _id: convId },
    {
      $set: {
        lastMessageAt: new Date(),
        lastMessagePreview: trimmed.slice(0, 140),
      },
    },
  )

  const fresh = await Conversation.findById(convId).lean()
  const recipients = (fresh?.participants || [])
    .map((p: string) => p.toLowerCase())
    .filter(p => p && p !== sender)

  for (const r of recipients) {
    await enqueueNotification({
      recipientWalletAddress: r,
      kind: 'dm',
      title: 'New message',
      body: trimmed.slice(0, 160),
      link: `/submissions/${submissionId}`,
      payload: { submissionId, conversationId: String(convId) },
    })
  }

  return msg
}

export async function markMessagesRead(
  submissionId: string,
  readerWallet: string,
) {
  await assertSubmissionAccess(submissionId, readerWallet)
  const conv = await Conversation.findOne({
    submissionId: new mongoose.Types.ObjectId(submissionId),
  })
  if (!conv) return { updated: 0 }
  const r = readerWallet.toLowerCase()

  const result = await Message.updateMany(
    {
      conversationId: conv._id,
      readBy: { $ne: r },
    },
    { $addToSet: { readBy: r } },
  )

  return { updated: result.modifiedCount ?? 0 }
}

export async function listConversationsForWallet(walletAddress: string) {
  const w = walletAddress.toLowerCase()
  const rows = await Conversation.find({ participants: w })
    .sort({ lastMessageAt: -1 })
    .limit(100)
    .lean()

  const submissionIds = rows.map(r => r.submissionId)
  const subs = await Submission.find({
    _id: { $in: submissionIds },
  })
    .select({ userWalletAddress: 1, status: 1, treesPlanted: 1 })
    .lean()

  const subMap = new Map(subs.map(s => [String(s._id), s]))

  return rows.map(r => ({
    conversationId: String(r._id),
    submissionId: String(r.submissionId),
    lastMessageAt: r.lastMessageAt,
    lastMessagePreview: r.lastMessagePreview,
    submission: subMap.get(String(r.submissionId)) || null,
  }))
}
