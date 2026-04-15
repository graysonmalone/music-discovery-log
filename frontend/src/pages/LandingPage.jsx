import { useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function LandingPage() {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/collection', { replace: true })
    }
  }, [isAuthenticated, navigate])

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4">
      <h1 className="text-5xl font-bold text-white mb-4">Music Discovery Log</h1>
      <p className="text-xl text-gray-400 max-w-lg mb-8">
        Search for artists and albums, save them to your personal collection, and write your take on each one.
      </p>
      <div className="flex gap-4">
        <Link
          to="/register"
          className={cn(buttonVariants({ size: 'lg' }), 'bg-purple-600 hover:bg-purple-700')}
        >
          Get started
        </Link>
        <Link
          to="/login"
          className={cn(buttonVariants({ size: 'lg', variant: 'outline' }), 'border-purple-700 text-purple-400 hover:bg-purple-900/30 hover:text-purple-300 hover:border-purple-500')}
        >
          Log in
        </Link>
      </div>
    </div>
  )
}
