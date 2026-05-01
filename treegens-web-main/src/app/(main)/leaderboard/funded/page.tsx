'use client'

import { LeaderboardItem } from '@/components/LeaderboardItem'
import { LeaderboardTopTabs } from '@/components/LeaderboardTopTabs'
import { HubPageHeader } from '@/components/Layout/HubPageHeader'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { useEffect, useState } from 'react'
import { getFundedLeaderboard } from '@/services/app'
import { IFundedLeaderboardUser } from '@/types'

const ITEMS_PER_LOAD = 10

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
      const response = await getFundedLeaderboard(page, ITEMS_PER_LOAD)
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
    <div className="flex min-h-screen flex-col gap-4 px-4 pb-28 pt-3">
      <HubPageHeader title="Leaderboard" subtitle="Trees funded · MGRO burned" />

      <LeaderboardTopTabs />

      {loading && rows.length === 0 ? (
        <div className="flex h-32 items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : error ? (
        <div className="tg-pill-card-muted py-8 text-center">
          <p className="mb-4 text-red-600">{error}</p>
          <Button color="gray" onClick={() => fetchFundedLeaderboard()}>
            Try Again
          </Button>
        </div>
      ) : rows.length > 0 ? (
        <>
          <div className="tg-pill-card-muted p-4">
            {rows.map(row => (
              <LeaderboardItem
                key={row._id}
                variant="funded"
                rank={row.rank}
                walletAddress={row.walletAddress}
                totalBurnedMgroWei={row.totalBurnedMgroWei}
              />
            ))}
          </div>
          {totalPages > 1 && (
            <div className="mt-4 flex flex-col gap-4">
              {hasMore && (
                <div className="flex justify-center">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={loadMore}
                    className="tg-pill-row-btn min-w-[140px] justify-center font-black uppercase tracking-wide"
                  >
                    {loading ? <Spinner size="sm" /> : 'Load more'}
                  </button>
                </div>
              )}
              <div className="text-center text-sm font-medium text-[#6b6560]">
                Page {currentPage} of {totalPages}
                {rows.length > 0 && <span> · {rows.length} shown</span>}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="tg-pill-card-muted py-8 text-center">
          <p className="text-[#6b6560]">No funded leaderboard data available</p>
        </div>
      )}
    </div>
  )
}
