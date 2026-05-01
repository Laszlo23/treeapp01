import { axiosInstance } from './axiosInstance'

export async function setVerifierDelegate(walletAddress: string) {
  return axiosInstance.post('/api/users/me/delegate', { walletAddress })
}

export async function clearVerifierDelegate() {
  return axiosInstance.delete('/api/users/me/delegate')
}

export async function fetchDelegators() {
  return axiosInstance.get<{
    message: string
    data: {
      delegators: Array<{
        walletAddress: string
        name?: string
        verifierDelegateSetAt?: string
      }>
    }
  }>('/api/users/me/delegators')
}
