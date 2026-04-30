import { ethers } from 'ethers'
import env from '../config/environment'
import BurnAggregate from '../models/BurnAggregate'
import BurnIndexerState from '../models/BurnIndexerState'

const TRANSFER_EVENT_ABI = [
  'event Transfer(address indexed from, address indexed to, uint256 value)',
]
const TRANSFER_TOPIC = ethers.id('Transfer(address,address,uint256)')
const ZERO_ADDRESS_TOPIC = ethers.zeroPadValue(ethers.ZeroAddress, 32)

type BurnDelta = {
  burnedWei: bigint
  burnCount: number
}

export default class BurnIndexerService {
  private provider: ethers.JsonRpcProvider

  private readonly contractAddress: string

  private readonly confirmations: number

  private readonly chunkSize: number

  private readonly pollMs: number

  private readonly startBlock: number

  private readonly iface = new ethers.Interface(TRANSFER_EVENT_ABI)

  private timer: NodeJS.Timeout | null = null

  private syncInProgress = false

  constructor() {
    const rpcUrl = env.BASE_SEPOLIA_RPC_URL
    if (!rpcUrl) {
      throw new Error('BASE_SEPOLIA_RPC_URL is required for burn indexer')
    }
    this.provider = new ethers.JsonRpcProvider(rpcUrl)
    this.contractAddress = env.MGRO_TOKEN_ADDRESS.toLowerCase()
    this.confirmations = env.BURN_INDEXER_CONFIRMATIONS
    this.chunkSize = env.BURN_INDEXER_CHUNK_SIZE
    this.pollMs = env.BURN_INDEXER_POLL_MS
    this.startBlock = env.MGRO_BURN_START_BLOCK
  }

  async syncOnce() {
    if (this.syncInProgress) return
    this.syncInProgress = true
    try {
      const head = await this.provider.getBlockNumber()
      const confirmedHead = Math.max(0, head - this.confirmations)
      const fromBlock = await this.getNextFromBlock()
      if (fromBlock > confirmedHead) {
        return
      }

      let current = fromBlock
      while (current <= confirmedHead) {
        const toBlock = Math.min(confirmedHead, current + this.chunkSize - 1)
        await this.processRange(current, toBlock)
        current = toBlock + 1
      }
    } finally {
      this.syncInProgress = false
    }
  }

  start() {
    if (this.timer) return

    const tick = async () => {
      try {
        await this.syncOnce()
      } catch (error: any) {
        console.error('[BurnIndexerService] Sync tick failed', {
          message: error?.message || String(error),
        })
      } finally {
        this.timer = setTimeout(tick, this.pollMs)
      }
    }

    tick().catch(error => {
      console.error('[BurnIndexerService] Initial tick failed', {
        message: error?.message || String(error),
      })
    })
  }

  stop() {
    if (!this.timer) return
    clearTimeout(this.timer)
    this.timer = null
  }

  private async getNextFromBlock() {
    const state = await BurnIndexerState.findOne({
      contractAddress: this.contractAddress,
    }).lean()
    if (!state) return this.startBlock
    return Math.max(this.startBlock, Number(state.lastProcessedBlock || 0) + 1)
  }

  private async processRange(fromBlock: number, toBlock: number) {
    const logs = await this.provider.getLogs({
      address: this.contractAddress,
      fromBlock,
      toBlock,
      topics: [TRANSFER_TOPIC, null, ZERO_ADDRESS_TOPIC],
    })

    const deltas = new Map<string, BurnDelta>()
    for (const log of logs) {
      const parsed = this.iface.parseLog(log)
      if (!parsed) continue
      const from = String(parsed.args.from).toLowerCase()
      const value = BigInt(parsed.args.value.toString())
      if (value <= 0n) continue
      const existing = deltas.get(from)
      if (existing) {
        existing.burnedWei += value
        existing.burnCount += 1
      } else {
        deltas.set(from, { burnedWei: value, burnCount: 1 })
      }
    }

    await this.applyDeltas(deltas)
    await BurnIndexerState.updateOne(
      { contractAddress: this.contractAddress },
      {
        $set: {
          contractAddress: this.contractAddress,
          lastProcessedBlock: toBlock,
        },
      },
      { upsert: true },
    )
  }

  private async applyDeltas(deltas: Map<string, BurnDelta>) {
    for (const [walletAddress, delta] of deltas.entries()) {
      const existing = await BurnAggregate.findOne({ walletAddress })
        .select('totalBurnedMgroWei burnCount')
        .lean()
      const currentWei = BigInt(existing?.totalBurnedMgroWei || '0')
      const currentCount = Number(existing?.burnCount || 0)

      await BurnAggregate.updateOne(
        { walletAddress },
        {
          $set: {
            walletAddress,
            totalBurnedMgroWei: (currentWei + delta.burnedWei).toString(),
            burnCount: currentCount + delta.burnCount,
          },
        },
        { upsert: true },
      )
    }
  }
}
