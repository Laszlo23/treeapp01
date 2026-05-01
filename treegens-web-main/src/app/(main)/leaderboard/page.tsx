'use client'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { useCallback, useEffect, useState } from 'react'
import { LeaderboardItem } from '@/components/LeaderboardItem'
import { LeaderboardTopTabs } from '@/components/LeaderboardTopTabs'
import { HubPageHeader } from '@/components/Layout/HubPageHeader'
import { useUser } from '@/contexts/UserProvider'
import { getLeaderboard } from '@/services/app'
import { ILeaderboardItem, ILeaderboardUser } from '@/types'

const ITEMS_PER_LOAD = 10

function mapUserToLeaderboardItem(u: ILeaderboardUser): ILeaderboardItem {
  return {
    id: u.rank,
    name: u.name || 'Anonymous',
    address: u.walletAddress,
    treesMounted: u.treesPlanted,
  }
}

export default function LeaderBoard() {
  const [leaderboardData, setLeaderboardData] = useState<ILeaderboardItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [hasMore, setHasMore] = useState(false)

  const { user } = useUser()

  const fetchLeaderboard = useCallback(
    async (page: number = 1, append: boolean = false) => {
      setLoading(true)
      setError(null)
      try {
        const response = await getLeaderboard(
          page,
          ITEMS_PER_LOAD,
          user?.walletAddress,
        )
        const { users, pagination } = response.data.data

        const mappedUsers = users.map(mapUserToLeaderboardItem)

        if (append) {
          setLeaderboardData(prev => [...prev, ...mappedUsers])
        } else {
          setLeaderboardData(mappedUsers)
        }

        setCurrentPage(pagination.page)
        setTotalPages(pagination.pages)
        setHasMore(pagination.page < pagination.pages)
      } catch (err) {
        console.error('Error fetching leaderboard:', err)
        setError('Failed to load leaderboard data')
      } finally {
        setLoading(false)
      }
    },
    [user?.walletAddress],
  )

  const loadMore = () => {
    if (hasMore && !loading) {
      fetchLeaderboard(currentPage + 1, true)
    }
  }

  useEffect(() => {
    setCurrentPage(1)
    setLeaderboardData([])
    void fetchLeaderboard(1, false)
  }, [fetchLeaderboard])

  return (
    <div className="flex min-h-screen flex-col gap-4 px-4 pb-28 pt-3">
      <HubPageHeader
        title="Leaderboard"
        subtitle="Trees planted · tap a planter"
      />

      <LeaderboardTopTabs />

      {loading && leaderboardData.length === 0 ? (
        <div className="flex h-32 items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : error ? (
        <div className="tg-pill-card-muted py-8 text-center">
          <p className="mb-4 text-red-600">{error}</p>
          <Button color="gray" onClick={() => void fetchLeaderboard(1, false)}>
            Try Again
          </Button>
        </div>
      ) : leaderboardData.length > 0 ? (
        <>
          <div className="tg-pill-card-muted p-4">
            {leaderboardData.map(item => (
              <LeaderboardItem key={`${item.address}-${item.id}`} item={item} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex flex-col gap-4">
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
                {leaderboardData.length > 0 && (
                  <span> · {leaderboardData.length} shown</span>
                )}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="tg-pill-card-muted py-8 text-center">
          <p className="text-[#6b6560]">No leaderboard data available</p>
        </div>
      )}
    </div>
  )
}
