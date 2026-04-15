import { useQuery } from '@tanstack/react-query'
import { getProfile } from '@/api/profile'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorMessage } from '@/components/ErrorMessage'

export function ProfilePage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['profile'],
    queryFn: getProfile,
  })

  if (isLoading) return <LoadingSpinner />
  if (error) return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <ErrorMessage message="Failed to load profile." />
    </div>
  )

  const { user, counts } = data
  const total = counts.loved + counts.want_to_listen + counts.overrated

  return (
    <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold text-white">Profile</h1>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-3">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">Name</p>
          <p className="text-white font-medium">{user.name}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">Email</p>
          <p className="text-gray-300">{user.email}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">Member since</p>
          <p className="text-gray-300">
            {new Date(user.created_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="text-white font-semibold mb-4">Collection</h2>
        <div className="grid grid-cols-2 gap-4">
          <StatBox label="Total" value={total} color="text-white" />
          <StatBox label="Loved" value={counts.loved} color="text-pink-400" />
          <StatBox label="Want to Listen" value={counts.want_to_listen} color="text-blue-400" />
          <StatBox label="Overrated" value={counts.overrated} color="text-amber-400" />
        </div>
      </div>
    </div>
  )
}

function StatBox({ label, value, color }) {
  return (
    <div className="bg-gray-800 rounded-lg p-4 text-center">
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  )
}
