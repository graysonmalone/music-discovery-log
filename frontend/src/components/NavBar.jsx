import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function NavBar() {
  const { isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <nav className="border-b border-gray-800 bg-gray-950 px-6 py-3">
      <div className="mx-auto flex max-w-5xl items-center justify-between">
        <Link to="/" className="text-lg font-bold text-white hover:text-purple-400 transition-colors">
          Music Discovery Log
        </Link>

        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <>
              <Link
                to="/search"
                className="text-sm text-gray-300 hover:text-white transition-colors"
              >
                Search
              </Link>
              <Link
                to="/collection"
                className="text-sm text-gray-300 hover:text-white transition-colors"
              >
                Collection
              </Link>
              <Link
                to="/profile"
                className="text-sm text-gray-300 hover:text-white transition-colors"
              >
                Profile
              </Link>
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
              <Link
                to="/login"
                className="text-sm text-gray-300 hover:text-white transition-colors"
              >
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
