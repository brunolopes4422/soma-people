import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import './styles/global.css'

import AppLayout            from './components/layout/AppLayout'
import Login                from './pages/Login'
import ListaColaboradores   from './pages/ListaColaboradores'
import FormColaborador      from './pages/FormColaborador'
import FichaColaborador     from './pages/FichaColaborador'
import DashboardEquipe      from './pages/DashboardEquipe'
import BancoTalentos        from './pages/talent/BancoTalentos'
import TriagemCandidatos    from './pages/talent/TriagemCandidatos'
import Usuarios             from './pages/Usuarios'
import TrabalheConosco      from './pages/TrabalheConosco'
import ResponderFormulario  from './pages/ResponderFormulario'
import FormularioPublico    from './pages/FormularioPublico'
import ListaFormularios     from './pages/ListaFormularios'
import EditorFormulario     from './pages/EditorFormulario'
import RespostasFormulario  from './pages/RespostasFormulario'

function EmBreve({ nome }) {
  return (
    <div style={{ padding: '2rem' }}>
      <h2 style={{ color: 'var(--text)', marginBottom: '0.5rem' }}>{nome}</h2>
      <p style={{ color: 'var(--text-3)', fontSize: '13px' }}>Em construção...</p>
    </div>
  )
}

function RotaProtegida({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', color:'var(--text-3)', fontSize:'13px' }}>
      Carregando...
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  return children
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Públicas */}
          <Route path="/login"              element={<Login />} />
          <Route path="/trabalhe-conosco"   element={<TrabalheConosco />} />
          <Route path="/f/:token"           element={<ResponderFormulario />} />
          <Route path="/form/:slug"         element={<FormularioPublico />} />

          {/* Protegidas */}
          <Route path="/" element={
            <RotaProtegida>
              <AppLayout />
            </RotaProtegida>
          }>
            <Route index element={<Navigate to="/colaboradores" replace />} />
            <Route path="colaboradores"             element={<ListaColaboradores />} />
            <Route path="colaboradores/novo"        element={<FormColaborador />} />
            <Route path="colaboradores/:id"         element={<FichaColaborador />} />
            <Route path="colaboradores/:id/editar"  element={<FormColaborador />} />
            <Route path="equipe"                    element={<DashboardEquipe />} />
            <Route path="formularios"               element={<ListaFormularios />} />
            <Route path="formularios/novo"          element={<EditorFormulario />} />
            <Route path="formularios/:id"           element={<EditorFormulario />} />
            <Route path="formularios/:id/respostas" element={<RespostasFormulario />} />
            <Route path="talentos"                  element={<BancoTalentos />} />
            <Route path="talentos/triagem"          element={<TriagemCandidatos />} />
            <Route path="usuarios"                  element={<Usuarios />} />
            <Route path="auditoria"                 element={<EmBreve nome="Auditoria" />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode><App /></StrictMode>
)