import { NavLink, useNavigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { podeVer } from '../../lib/permissoes'
import styles from './AppLayout.module.css'

export default function AppLayout() {
  const { perfil, logout } = useAuth()
  const navigate = useNavigate()
  const p = perfil?.perfil

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  function link(to) {
    return ({ isActive }) => isActive
      ? `${styles.link} ${styles.active}`
      : styles.link
  }

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>◆</span>
          <span className={styles.logoText}>Soma People</span>
        </div>

        <nav className={styles.nav}>
          <p className={styles.navLabel}>Equipe</p>
          <NavLink to="/colaboradores" className={link('/colaboradores')}>
            <IconPeople /> Colaboradores
          </NavLink>
          <NavLink to="/equipe" className={link('/equipe')}>
            <IconDashboard /> Dashboard equipe
          </NavLink>

          {podeVer(p, 'criarFormularios') && (
            <>
              <p className={styles.navLabel}>Avaliações</p>
              <NavLink to="/formularios" className={link('/formularios')}>
                <IconForm /> Formulários
              </NavLink>
            </>
          )}

          {podeVer(p, 'verCandidatos') && (
            <>
              <p className={styles.navLabel}>Talentos</p>
              <NavLink to="/talentos" className={link('/talentos')}>
                <IconTalent /> Banco de talentos
              </NavLink>
              <NavLink to="/talentos/triagem" className={link('/talentos/triagem')}>
                <IconTriagem /> Triagem
              </NavLink>
            </>
          )}

          {podeVer(p, 'gerirUsuarios') && (
            <>
              <p className={styles.navLabel}>Sistema</p>
              <NavLink to="/usuarios" className={link('/usuarios')}>
                <IconUsers /> Usuários
              </NavLink>
              <NavLink to="/auditoria" className={link('/auditoria')}>
                <IconAudit /> Auditoria
              </NavLink>
            </>
          )}
        </nav>

        <div className={styles.userBox}>
          <div className={styles.userInfo}>
            <span className={styles.userName}>{perfil?.nome}</span>
            <span className={styles.userPerfil}>{traduzirPerfil(perfil?.perfil)}</span>
          </div>
          <button className={styles.btnLogout} onClick={handleLogout} title="Sair">
            <IconLogout />
          </button>
        </div>
      </aside>

      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  )
}

function traduzirPerfil(p) {
  return {
    super_admin: 'Super Admin',
    gestor:      'Gestor',
    rh:          'RH',
    colaborador: 'Colaborador',
  }[p] || p
}

function IconPeople() {
  return <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><circle cx="6" cy="5" r="2.5"/><path d="M1 13c0-3 2-4.5 5-4.5s5 1.5 5 4.5"/><circle cx="12" cy="5" r="2"/><path d="M14 13c0-2-1-3.5-3-4"/></svg>
}

function IconDashboard() {
  return <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><rect x="1" y="1" width="6" height="6" rx="1"/><rect x="9" y="1" width="6" height="6" rx="1"/><rect x="1" y="9" width="6" height="6" rx="1"/><rect x="9" y="9" width="6" height="6" rx="1"/></svg>
}

function IconForm() {
  return <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><rect x="2" y="1" width="12" height="14" rx="1"/><path d="M5 5h6M5 8h6M5 11h4"/></svg>
}

function IconTalent() {
  return <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><circle cx="8" cy="8" r="6"/><path d="M8 5v3l2 2"/></svg>
}

function IconTriagem() {
  return <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M2 4h12M4 8h8M6 12h4"/></svg>
}

function IconUsers() {
  return <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><circle cx="8" cy="5" r="3"/><path d="M2 14c0-3 2.5-5 6-5s6 2 6 5"/></svg>
}

function IconAudit() {
  return <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M3 3h10v10H3z"/><path d="M6 6h4M6 9h4"/></svg>
}

function IconLogout() {
  return <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3M10 11l3-3-3-3M13 8H6"/></svg>
}