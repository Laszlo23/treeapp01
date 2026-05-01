import { axiosInstance } from './axiosInstance'

export async function getSubmissionConversation(submissionId: string) {
  return axiosInstance.get<{
    message: string
    data: {
      conversation: Record<string, unknown>
      messages: Array<{
        _id: string
        senderWalletAddress: string
        body: string
        createdAt?: string
      }>
    }
  }>(`/api/submissions/${encodeURIComponent(submissionId)}/conversation`)
}

export async function postSubmissionMessage(
  submissionId: string,
  body: string,
) {
  return axiosInstance.post(
    `/api/submissions/${encodeURIComponent(submissionId)}/conversation/messages`,
    { body },
  )
}

export async function listConversations() {
  return axiosInstance.get<{
    message: string
    data: { conversations: unknown[] }
  }>('/api/conversations')
}
