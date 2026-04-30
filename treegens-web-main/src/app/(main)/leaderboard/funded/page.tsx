'use client'

import { LeaderboardTopTabs } from '@/components/LeaderboardTopTabs'
import { Address } from '@/components/Address'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { useEffect, useState } from 'react'
import { getFundedLeaderboard } from '@/services/app'
import { axiosInstance } from '@/services/axiosInstance'
import { IFundedLeaderboardUser } from '@/types'
import { formatWeiToMgro } from '@/utils/formatWeiToMgro'

const ITEMS_PER_LOAD = 10

async function getFundedLeaderboardFallback(page: number, limit: number) {
  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('limit', String(limit))
  const res = await axiosInstance.get<{
    message: string
    data: Array<{
      walletAddress: string
      totalBurnedMgroWei: string
      burnCount: number
      updatedAt: string
    }>
  }>(`/api/users/leaderboard/trees-funded?${params.toString()}`)
  const rows = res.data.data || []
  const offset = (page - 1) * limit
  const users = rows.map((u, i) => ({
    _id: `${u.walletAddress}-${offset + i + 1}`,
    walletAddress: u.walletAddress,
    totalBurnedMgroWei: u.totalBurnedMgroWei,
    burnCount: u.burnCount,
    updatedAt: u.updatedAt,
    rank: offset + i + 1,
  }))
  const hasMore = rows.length >= limit
  return {
    data: {
      message: res.data.message,
      data: {
        users,
        pagination: {
          page,
          limit,
          total: hasMore ? page * limit + 1 : offset + rows.length,
          pages: hasMore ? page + 1 : page,
        },
      },
    },
  }
}

function FundedTreesCard({
  walletAddress,
  totalBurnedMgroWei,
}: {
  walletAddress: string
  totalBurnedMgroWei: string
}) {
  const burned = formatWeiToMgro(totalBurnedMgroWei)
  return (
    <div className="flex items-center justify-between rounded-xl border border-[#e5e7eb] bg-white px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="min-w-0">
          <Address
            address={walletAddress}
            className="truncate text-sm font-semibold text-[#111827]"
            blobbieSize={40}
          />
        </div>
      </div>
      <div className="text-right">
        <p className="text-base font-bold text-[#4d341e]">
          {burned.toLocaleString(undefined, { maximumFractionDigits: 2 })} MGRO
        </p>
      </div>
    </div>
  )
}

export default function LeaderboardFundedPage() {
  const [rows, setRows] = useState<IFundedLeaderboardUser[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [hasMore, setHasMore] = useState(false)

  const fetchFundedLeaderboard = async (
    page: number = 1,
    append: boolean = false,
  ) => {
    setLoading(true)
    setError(null)
    try {
      const loader =
        typeof getFundedLeaderboard === 'function'
          ? getFundedLeaderboard
          : getFundedLeaderboardFallback
      const response = await loader(page, ITEMS_PER_LOAD)
      const { users, pagination } = response.data.data
      if (append) {
        setRows(prev => [...prev, ...users])
      } else {
        setRows(users)
      }
      setCurrentPage(pagination.page)
      setTotalPages(pagination.pages)
      setHasMore(pagination.page < pagination.pages)
    } catch (err) {
      console.error('Error fetching funded leaderboard:', err)
      setError('Failed to load funded leaderboard')
    } finally {
      setLoading(false)
    }
  }

  const loadMore = () => {
    if (hasMore && !loading) {
      fetchFundedLeaderboard(currentPage + 1, true)
    }
  }

  useEffect(() => {
    setCurrentPage(1)
    setRows([])
    fetchFundedLeaderboard()
  }, [])

  return (
    <div className="flex flex-col gap-4 p-6">
      <LeaderboardTopTabs />
      {loading && rows.length === 0 ? (
        <div className="flex h-32 items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : error ? (
        <div className="py-8 text-center">
          <p className="mb-4 text-red-500">{error}</p>
          <Button color="gray" onClick={() => fetchFundedLeaderboard()}>
            Try Again
          </Button>
        </div>
      ) : rows.length > 0 ? (
        <>
          <div className="flex flex-col gap-3">
            {rows.map(row => (
              <FundedTreesCard key={row._id} {...row} />
            ))}
          </div>
          {totalPages > 1 && (
            <div className="mt-4 flex flex-col gap-4">
              {hasMore && (
                <div className="flex justify-center">
                  <Button
                    color="gray"
                    onClick={loadMore}
                    disabled={loading}
                    className="min-w-[120px]"
                  >
                    {loading ? <Spinner size="sm" /> : 'Load More'}
                  </Button>
                </div>
              )}
              <div className="text-center text-sm font-medium text-warm-grey-400">
                Page {currentPage} of {totalPages}
                {rows.length > 0 && <span> • Showing {rows.length} items</span>}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="py-8 text-center">
          <p className="text-gray-500">No funded leaderboard data available</p>
        </div>
      )}
    </div>
  )
}
