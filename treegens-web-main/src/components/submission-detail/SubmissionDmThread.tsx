'use client'

import {
  getSubmissionConversation,
  postSubmissionMessage,
} from '@/services/conversationService'
import { useNotifications } from '@/contexts/NotificationProvider'
import cn from 'classnames'
import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { HiChevronDown, HiChevronUp } from 'react-icons/hi2'

type Msg = {
  _id: string
  senderWalletAddress: string
  body: string
  createdAt?: string
}

export function SubmissionDmThread({ submissionId }: { submissionId: string }) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Msg[]>([])
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const { refreshUnread } = useNotifications()

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const res = await getSubmissionConversation(submissionId)
      const envelope = res.data as {
        data?: { messages?: Msg[] }
      }
      const list = (envelope.data?.messages ?? []) as Msg[]
      setMessages(list)
    } catch (e) {
      console.error(e)
      toast.error('Could not load messages')
    } finally {
      setLoading(false)
    }
  }, [submissionId])

  useEffect(() => {
    if (!open) return
    void load()
    const id = window.setInterval(() => void load(), 15_000)
    return () => window.clearInterval(id)
  }, [open, load])

  const send = async () => {
    const text = draft.trim()
    if (!text || sending) return
    try {
      setSending(true)
      await postSubmissionMessage(submissionId, text)
      setDraft('')
      await load()
      void refreshUnread()
    } catch {
      toast.error('Send failed')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="tg-card mt-4 border-neutral-200 bg-white">
      <button
        type="button"
        className="flex w-full flex-row items-center justify-between px-4 py-3 text-left"
        onClick={() => setOpen(o => !o)}
      >
        <span className="text-sm font-bold text-[#2d2419]">
          Messages with reviewers
        </span>
        {open ? (
          <HiChevronUp className="h-5 w-5 text-[#6b6560]" />
        ) : (
          <HiChevronDown className="h-5 w-5 text-[#6b6560]" />
        )}
      </button>
      {open ? (
        <div className="border-t border-neutral-100 px-3 pb-3 pt-2">
          <div className="max-h-56 space-y-2 overflow-y-auto">
            {loading && messages.length === 0 ? (
              <p className="text-center text-xs text-[#6b6560]">Loading…</p>
            ) : messages.length === 0 ? (
              <p className="text-center text-xs text-[#6b6560]">
                No messages yet — say hi to coordinate verification.
              </p>
            ) : (
              messages.map(m => (
                <div
                  key={m._id}
                  className={cn(
                    'rounded-2xl px-3 py-2 text-sm',
                    'bg-[#f3f4f6] text-[#111]',
                  )}
                >
                  <p className="text-[10px] font-mono text-[#9ca3af]">
                    {m.senderWalletAddress.slice(0, 6)}…
                    {m.senderWalletAddress.slice(-4)}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-[#1f2937]">{m.body}</p>
                </div>
              ))
            )}
          </div>
          <div className="mt-2 flex gap-2">
            <input
              className="tg-card min-h-[44px] flex-1 border px-3 py-2 text-sm outline-none"
              placeholder="Write a message…"
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  void send()
                }
              }}
            />
            <button
              type="button"
              className="tg-cta shrink-0 px-4 py-2 text-sm"
              disabled={sending || !draft.trim()}
              onClick={() => void send()}
            >
              Send
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
