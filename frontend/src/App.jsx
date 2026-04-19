import { Routes, Route } from 'react-router-dom'
import { NavBar } from '@/components/NavBar'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { LandingPage } from '@/pages/LandingPage'
import { LoginPage } from '@/pages/LoginPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { SearchPage } from '@/pages/SearchPage'
import { CollectionPage } from '@/pages/CollectionPage'
import { CollectionDetailPage } from '@/pages/CollectionDetailPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { ArtistPage } from '@/pages/ArtistPage'
import { AlbumPage } from '@/pages/AlbumPage'

function App() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <NavBar />
      <main>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/search"
            element={
              <ProtectedRoute>
                <SearchPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/collection"
            element={
              <ProtectedRoute>
                <CollectionPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/collection/:id"
            element={
              <ProtectedRoute>
                <CollectionDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route path="/artist/:id" element={<ArtistPage />} />
          <Route path="/album/:id" element={<AlbumPage />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
