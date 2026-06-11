import { Navigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

export default function RotaProtegida({ children, perfilNecessario }) {
  const { user, perfil, loading } = useAuth()

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <span style={{ color: 'var(--text-3)', fontSize: 13 }}>Carregando...</span>
      </div>
    )
  }

  if (!user || !perfil) return <Navigate to="/login" replace />

  if (perfilNecessario && perfil.perfil !== perfilNecessario) {
    return <Navigate to="/colaboradores" replace />
  }

  return children
}
