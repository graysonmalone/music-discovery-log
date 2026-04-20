import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { getNotifications, markNotificationsRead, followUser, getFollowing } from '@/api/social'

export function NavBar() {
  const { isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [bellOpen, setBellOpen] = useState(false)
  const bellRef = useRef(null)

  function handleLogout() {
    logout()
    navigate('/login')
  }

  // Poll notifications every 30s
  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: getNotifications,
    enabled: isAuthenticated,
    refetchInterval: 30000,
  })

  const { data: following = [] } = useQuery({
    queryKey: ['following'],
    queryFn: getFollowing,
    enabled: isAuthenticated,
  })

  const followingIds = new Set(following.map(u => u.id))

  const markReadMutation = useMutation({
    mutationFn: markNotificationsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const followMutation = useMutation({
    mutationFn: followUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['following'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const unreadCount = notifications.filter(n => !n.read).length

  function openBell() {
    setBellOpen(true)
    if (unreadCount > 0) markReadMutation.mutate()
  }

  // Close dropdown on outside click
  useEffect(() => {
    if (!bellOpen) return
    function handleClick(e) {
      if (bellRef.current && !bellRef.current.contains(e.target)) {
        setBellOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [bellOpen])

  return (
    <nav className="border-b border-gray-800 bg-gray-950 px-6 py-3">
      <div className="mx-auto flex max-w-5xl items-center justify-between">
        <Link to="/" className="flex flex-col leading-tight">
          <span className="text-lg font-bold text-white hover:text-purple-400 transition-colors">Resonate</span>
          <span className="text-xs text-gray-500">Social Music Platform</span>
        </Link>

        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <>
              <Link to="/search" className="text-sm text-gray-300 hover:text-white transition-colors">
                Search
              </Link>
              <Link to="/collection" className="text-sm text-gray-300 hover:text-white transition-colors">
                Collection
              </Link>
              <Link to="/social" className="text-sm text-gray-300 hover:text-white transition-colors">
                Social
              </Link>
              <Link to="/profile" className="text-sm text-gray-300 hover:text-white transition-colors">
                Profile
              </Link>

              {/* Notification Bell */}
              <div className="relative" ref={bellRef}>
                <button
                  onClick={() => bellOpen ? setBellOpen(false) : openBell()}
                  className="relative text-gray-400 hover:text-white transition-colors p-1"
                  aria-label="Notifications"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-medium leading-none">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {/* Dropdown */}
                {bellOpen && (
                  <div className="absolute right-0 mt-2 w-80 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl shadow-black/60 z-50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-800">
                      <p className="text-sm font-semibold text-white">Notifications</p>
                    </div>

                    {notifications.length === 0 ? (
                      <div className="px-4 py-6 text-center">
                        <p className="text-sm text-gray-500">No notifications yet.</p>
                      </div>
                    ) : (
                      <div className="max-h-80 overflow-y-auto">
                        {notifications.map(n => {
                          const alreadyFollowing = followingIds.has(n.from_user_id)
                          return (
                            <div
                              key={n.id}
                              className={`px-4 py-3 border-b border-gray-800 last:border-0 ${!n.read ? 'bg-purple-950/20' : ''}`}
                            >
                              <p className="text-sm text-gray-200 mb-2">
                                <Link
                                  to={`/users/${n.from_user_id}`}
                                  className="font-medium text-purple-400 hover:text-purple-300"
                                  onClick={() => setBellOpen(false)}
                                >
                                  {n.from_user_name}
                                </Link>
                                {n.type === 'follow' && ' added you'}
                                {n.type === 'like' && (n.reference_name ? ` liked your "${n.reference_name}"` : ' liked your save')}
                                {n.type === 'comment' && (n.reference_name ? ` commented on "${n.reference_name}"` : ' commented on your save')}
                              </p>
                              <div className="flex gap-2">
                                <Link
                                  to={`/users/${n.from_user_id}`}
                                  onClick={() => setBellOpen(false)}
                                  className="text-xs px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg transition-colors"
                                >
                                  View profile
                                </Link>
                                {!alreadyFollowing && (
                                  <button
                                    onClick={() => followMutation.mutate(n.from_user_id)}
                                    disabled={followMutation.isPending}
                                    className="text-xs px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                                  >
                                    Add back
                                  </button>
                                )}
                                {alreadyFollowing && (
                                  <span className="text-xs px-3 py-1 text-green-400">Following ✓</span>
                                )}
                              </div>
                              <p className="text-xs text-gray-600 mt-1.5">
                                {new Date(n.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-gray-400 hover:text-white"
              >
                Log out
              </Button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-sm text-gray-300 hover:text-white transition-colors">
                Log in
              </Link>
              <Link
                to="/register"
                className={cn(buttonVariants({ size: 'sm' }), 'bg-purple-600 hover:bg-purple-700')}
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
