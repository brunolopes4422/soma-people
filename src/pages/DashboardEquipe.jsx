import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import styles from './DashboardEquipe.module.css'

const SKILLS_CONFIG = [
  { id: 'comunicacao',            label: 'Comunicação'        },
  { id: 'relacionamento_cliente', label: 'Rel. cliente'       },
  { id: 'trabalho_equipe',        label: 'Trabalho em equipe' },
  { id: 'lideranca',              label: 'Liderança'          },
  { id: 'organizacao',            label: 'Organização'        },
  { id: 'execucao',               label: 'Execução'           },
  { id: 'proatividade',           label: 'Proatividade'       },
  { id: 'resiliencia',            label: 'Resiliência'        },
  { id: 'facilidade_aprendizado', label: 'Aprendizado'        },
  { id: 'autodidata',             label: 'Autodidata'         },
  { id: 'vendas',                 label: 'Vendas'             },
  { id: 'visao_estrategica',      label: 'Visão estratégica'  },
]

const PERFIS = [
  { id: 'perfil_campo',       label: 'Campo',         icon: '🏃' },
  { id: 'perfil_atendimento', label: 'Atendimento',   icon: '🎧' },
  { id: 'perfil_execucao',    label: 'Execução',      icon: '⚙️' },
  { id: 'perfil_lideranca',   label: 'Liderança',     icon: '👑' },
  { id: 'perfil_prova_fogo',  label: 'Prova de fogo', icon: '🔥' },
]

export default function DashboardEquipe() {
  const navigate = useNavigate()
  const [colaboradores, setColaboradores] = useState([])
  const [loading, setLoading]             = useState(true)
  const [filtroDept, setFiltroDept]       = useState('todos')
  const [filtroSkill, setFiltroSkill]     = useState('score_geral')
  const [filtroPerfil, setFiltroPerfil]   = useState('todos')
  const [vista, setVista]                 = useState('cards')

  useEffect(() => { carregar() }, [])

  async function carregar() {
    setLoading(true)
    const { data } = await supabase
      .from('colaboradores')
      .select('id,nome,cargo,departamento,foto_url,status,score_geral,skills_json,analise_json')
      .eq('status', 'ativo')
      .order('nome')
    setColaboradores(data ?? [])
    setLoading(false)
  }

  const departamentos = ['todos', ...new Set(colaboradores.map(c => c.departamento).filter(Boolean))]

  let filtrados = colaboradores
  if (filtroDept !== 'todos') filtrados = filtrados.filter(c => c.departamento === filtroDept)
  if (filtroPerfil !== 'todos') filtrados = filtrados.filter(c => c.analise_json?.[filtroPerfil] === 'apto')

  filtrados = [...filtrados].sort((a, b) => {
    const va = filtroSkill === 'score_geral' ? (a.score_geral ?? 0) : (a.skills_json?.[filtroSkill] ?? 0)
    const vb = filtroSkill === 'score_geral' ? (b.score_geral ?? 0) : (b.skills_json?.[filtroSkill] ?? 0)
    return vb - va
  })

  const medias = {}
  SKILLS_CONFIG.forEach(s => {
    const vals = colaboradores.map(c => c.skills_json?.[s.id] ?? 0).filter(v => v > 0)
    medias[s.id] = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0
  })

  const avaliados  = colaboradores.filter(c => c.score_geral > 0)
  const mediaGeral = avaliados.length
    ? Math.round(avaliados.reduce((a, b) => a + b.score_geral, 0) / avaliados.length)
    : 0

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Dashboard da equipe</h1>
          <p className={styles.subtitle}>
            {colaboradores.length} colaboradores · {avaliados.length} avaliados · média {mediaGeral}
          </p>
        </div>
      </div>

      {/* Métricas */}
      <div className={styles.metricas}>
        {SKILLS_CONFIG.slice(0, 6).map(s => (
          <div key={s.id} className={styles.metricaCard}>
            <span className={styles.metricaLabel}>{s.label}</span>
            <span className={`${styles.metricaVal} ${styles[cor(medias[s.id])]}`}>
              {medias[s.id] || '—'}
            </span>
            <div className={styles.metricaBar}>
              <div className={`${styles.metricaFill} ${styles['fill_' + cor(medias[s.id])]}`}
                style={{ width: (medias[s.id] || 0) + '%' }} />
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.filtroGrupo}>
          <span className={styles.filtroLabel}>Dept.</span>
          {departamentos.map(d => (
            <button key={d}
              className={`${styles.filtro} ${filtroDept === d ? styles.filtroOn : ''}`}
              onClick={() => setFiltroDept(d)}
            >{d === 'todos' ? 'Todos' : d}</button>
          ))}
        </div>

        <div className={styles.filtroGrupo}>
          <span className={styles.filtroLabel}>Perfil apto</span>
          <button className={`${styles.filtro} ${filtroPerfil === 'todos' ? styles.filtroOn : ''}`}
            onClick={() => setFiltroPerfil('todos')}>Todos</button>
          {PERFIS.map(p => (
            <button key={p.id}
              className={`${styles.filtro} ${filtroPerfil === p.id ? styles.filtroOn : ''}`}
              onClick={() => setFiltroPerfil(p.id)}
            >{p.icon} {p.label}</button>
          ))}
        </div>

        <div className={styles.filtroGrupo}>
          <span className={styles.filtroLabel}>Ordenar</span>
          <select className={styles.select} value={filtroSkill} onChange={e => setFiltroSkill(e.target.value)}>
            <option value="score_geral">Score geral</option>
            {SKILLS_CONFIG.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>

        <div className={styles.vistas}>
          {['cards','tabela','perfis'].map(v => (
            <button key={v}
              className={`${styles.vista} ${vista === v ? styles.vistaOn : ''}`}
              onClick={() => setVista(v)}
            >{v.charAt(0).toUpperCase() + v.slice(1)}</button>
          ))}
        </div>
      </div>

      {loading ? <p className={styles.estado}>Carregando...</p>
      : filtrados.length === 0 ? <p className={styles.estado}>Nenhum colaborador encontrado.</p>
      : <>
        {vista === 'cards' && (
          <div className={styles.grid}>
            {filtrados.map((c, i) => (
              <button key={c.id} className={styles.card} onClick={() => navigate(`/colaboradores/${c.id}`)}>
                <div className={styles.cardTopo}>
                  <span className={styles.pos}>#{i+1}</span>
                  <div className={styles.avatar}>{iniciais(c.nome)}</div>
                  <div className={styles.cardInfo}>
                    <span className={styles.cardNome}>{c.nome}</span>
                    <span className={styles.cardCargo}>{c.cargo || '—'}</span>
                    <span className={styles.cardDept}>{c.departamento}</span>
                  </div>
                  {c.score_geral > 0 && (
                    <div className={`${styles.score} ${styles['score_' + cor(c.score_geral)]}`}>
                      <span className={styles.scoreNum}>{c.score_geral}</span>
                      <span className={styles.scoreLabel}>score</span>
                    </div>
                  )}
                </div>
                {c.skills_json && Object.keys(c.skills_json).length > 0 && (
                  <div className={styles.cardSkills}>
                    {SKILLS_CONFIG.slice(0,4).map(s => {
                      const val = c.skills_json[s.id] ?? 0
                      return (
                        <div key={s.id} className={styles.skillRow}>
                          <span className={styles.skillLabel}>{s.label}</span>
                          <div className={styles.skillBar}>
                            <div className={`${styles.skillFill} ${styles['fill_' + cor(val)]}`} style={{ width: val+'%' }} />
                          </div>
                          <span className={styles.skillVal}>{val}</span>
                        </div>
                      )
                    })}
                  </div>
                )}
                {c.analise_json && (
                  <div className={styles.perfisRow}>
                    {PERFIS.map(p => (
                      <span key={p.id}
                        className={`${styles.perfilBadge} ${c.analise_json[p.id] === 'apto' ? styles.perfilApto : styles.perfilNao}`}
                        title={p.label}>{p.icon}</span>
                    ))}
                  </div>
                )}
                {!c.score_geral && <p className={styles.semAval}>Não avaliado</p>}
              </button>
            ))}
          </div>
        )}

        {vista === 'tabela' && (
          <div className={styles.tabelaWrap}>
            <table className={styles.tabela}>
              <thead>
                <tr>
                  <th className={styles.thNome}>Colaborador</th>
                  <th>Score</th>
                  {SKILLS_CONFIG.map(s => <th key={s.id}>{s.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {filtrados.map(c => (
                  <tr key={c.id} onClick={() => navigate(`/colaboradores/${c.id}`)} style={{ cursor: 'pointer' }}>
                    <td className={styles.tdNome}>
                      <span className={styles.tabelaNome}>{c.nome}</span>
                      <span className={styles.tabelaCargo}>{c.cargo}</span>
                    </td>
                    <td>
                      <span className={`${styles.tabelaScore} ${styles['score_' + cor(c.score_geral)]}`}>
                        {c.score_geral || '—'}
                      </span>
                    </td>
                    {SKILLS_CONFIG.map(s => {
                      const val = c.skills_json?.[s.id] ?? 0
                      return <td key={s.id}><span className={`${styles.cell} ${val > 0 ? styles['cell_' + cor(val)] : ''}`}>{val || '—'}</span></td>
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {vista === 'perfis' && (
          <div className={styles.perfisLayout}>
            {PERFIS.map(p => {
              const aptos    = filtrados.filter(c => c.analise_json?.[p.id] === 'apto')
              const parciais = filtrados.filter(c => c.analise_json?.[p.id] === 'parcialmente apto')
              return (
                <div key={p.id} className={styles.perfilCol}>
                  <div className={styles.perfilColHeader}>
                    <span>{p.icon}</span>
                    <span className={styles.perfilColLabel}>{p.label}</span>
                    <span className={styles.perfilColCount}>{aptos.length} aptos</span>
                  </div>
                  {aptos.map(c => (
                    <div key={c.id} className={`${styles.perfilItem} ${styles.itemApto}`}
                      onClick={() => navigate(`/colaboradores/${c.id}`)}>
                      <span className={styles.perfilAvatar}>{iniciais(c.nome)}</span>
                      <div>
                        <span className={styles.perfilNome}>{c.nome}</span>
                        <span className={styles.perfilCargo}>{c.cargo}</span>
                      </div>
                    </div>
                  ))}
                  {parciais.map(c => (
                    <div key={c.id} className={`${styles.perfilItem} ${styles.itemParcial}`}
                      onClick={() => navigate(`/colaboradores/${c.id}`)}>
                      <span className={styles.perfilAvatar}>{iniciais(c.nome)}</span>
                      <div>
                        <span className={styles.perfilNome}>{c.nome}</span>
                        <span className={styles.perfilCargo}>{c.cargo}</span>
                      </div>
                    </div>
                  ))}
                  {aptos.length === 0 && parciais.length === 0 && (
                    <p className={styles.perfilVazio}>Nenhum avaliado</p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </>}
    </div>
  )
}

function iniciais(nome) { return (nome||'?').split(' ').slice(0,2).map(n=>n[0]).join('').toUpperCase() }
function cor(val) { return val >= 75 ? 'alto' : val >= 50 ? 'medio' : val > 0 ? 'baixo' : 'zero' }