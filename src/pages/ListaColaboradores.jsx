import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { podeVer } from '../lib/permissoes'
import styles from './ListaColaboradores.module.css'

export default function ListaColaboradores() {
  const navigate = useNavigate()
  const { perfil } = useAuth()
  const [colaboradores, setColaboradores] = useState([])
  const [loading, setLoading]             = useState(true)
  const [busca, setBusca]                 = useState('')
  const [filtroDept, setFiltroDept]       = useState('todos')
  const [filtroStatus, setFiltroStatus]   = useState('ativo')

  useEffect(() => { carregar() }, [])

  async function carregar() {
    setLoading(true)
    const { data } = await supabase
      .from('colaboradores')
      .select('id, nome, cargo, departamento, status, score_geral, foto_url, data_admissao, skills_json, analise_json')
      .order('nome')
    setColaboradores(data ?? [])
    setLoading(false)
  }

  const departamentos = ['todos', ...new Set(
    colaboradores.map(c => c.departamento).filter(Boolean)
  )]

  const filtrados = colaboradores.filter(c => {
    const matchBusca  = c.nome.toLowerCase().includes(busca.toLowerCase()) ||
                        (c.cargo || '').toLowerCase().includes(busca.toLowerCase())
    const matchDept   = filtroDept === 'todos' || c.departamento === filtroDept
    const matchStatus = filtroStatus === 'todos' || c.status === filtroStatus
    return matchBusca && matchDept && matchStatus
  })

  const ativos      = colaboradores.filter(c => c.status === 'ativo').length
  const avaliados   = colaboradores.filter(c => c.score_geral > 0).length
  const mediaScore  = avaliados
    ? Math.round(colaboradores.filter(c => c.score_geral > 0).reduce((a, b) => a + b.score_geral, 0) / avaliados)
    : 0

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Colaboradores</h1>
          <p className={styles.subtitle}>
            {ativos} ativos · {avaliados} avaliados · média {mediaScore}
          </p>
        </div>
        {podeVer(perfil?.perfil, 'editarColaborador') && (
          <button className={styles.btnNovo} onClick={() => navigate('/colaboradores/novo')}>
            + Novo colaborador
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className={styles.toolbar}>
        <input
          className={styles.busca}
          placeholder="Buscar por nome ou cargo..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
        />
        <div className={styles.filtroGrupo}>
          {['ativo', 'afastado', 'desligado', 'todos'].map(s => (
            <button
              key={s}
              className={`${styles.filtro} ${filtroStatus === s ? styles.filtroOn : ''}`}
              onClick={() => setFiltroStatus(s)}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <select
          className={styles.select}
          value={filtroDept}
          onChange={e => setFiltroDept(e.target.value)}
        >
          {departamentos.map(d => (
            <option key={d} value={d}>{d === 'todos' ? 'Todos os departamentos' : d}</option>
          ))}
        </select>
      </div>

      {/* Lista */}
      {loading ? (
        <p className={styles.estado}>Carregando...</p>
      ) : filtrados.length === 0 ? (
        <p className={styles.estado}>Nenhum colaborador encontrado.</p>
      ) : (
        <div className={styles.grid}>
          {filtrados.map(c => (
            <button
              key={c.id}
              className={styles.card}
              onClick={() => navigate(`/colaboradores/${c.id}`)}
            >
              <div className={styles.cardTopo}>
                <div className={styles.avatar}>
                  {c.foto_url
                    ? <img src={c.foto_url} alt={c.nome} />
                    : iniciais(c.nome)
                  }
                </div>
                <div className={styles.cardInfo}>
                  <span className={styles.cardNome}>{c.nome}</span>
                  <span className={styles.cardCargo}>{c.cargo || '—'}</span>
                  <span className={styles.cardDept}>{c.departamento || '—'}</span>
                </div>
                {c.score_geral > 0 && (
                  <div className={`${styles.score} ${styles['score_' + nivelScore(c.score_geral)]}`}>
                    <span className={styles.scoreNum}>{c.score_geral}</span>
                    <span className={styles.scoreLabel}>score</span>
                  </div>
                )}
              </div>

              {/* Perfis de atuação */}
              {c.analise_json && Object.keys(c.analise_json).length > 0 && (
                <div className={styles.perfis}>
                  {PERFIS.map(p => {
                    const val = c.analise_json[p.key]
                    if (val !== 'apto') return null
                    return (
                      <span key={p.key} className={styles.perfilBadge} title={p.label}>
                        {p.icon}
                      </span>
                    )
                  })}
                </div>
              )}

              <span className={`${styles.statusBadge} ${styles['status_' + c.status]}`}>
                {c.status}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const PERFIS = [
  { key: 'perfil_campo',       label: 'Campo',         icon: '🏃' },
  { key: 'perfil_atendimento', label: 'Atendimento',   icon: '🎧' },
  { key: 'perfil_execucao',    label: 'Execução',      icon: '⚙️' },
  { key: 'perfil_lideranca',   label: 'Liderança',     icon: '👑' },
  { key: 'perfil_prova_fogo',  label: 'Prova de fogo', icon: '🔥' },
]

function iniciais(nome) {
  return (nome || '?').split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
}

function nivelScore(score) {
  return score >= 75 ? 'alto' : score >= 50 ? 'medio' : 'baixo'
}