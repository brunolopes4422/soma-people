import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { interpretarBusca } from '../../lib/iaService'
import styles from './BancoTalentos.module.css'

const SKILLS = ['comunicacao','organizacao','lideranca','tecnico','proatividade']

export default function BancoTalentos() {
  const navigate = useNavigate()
  const [candidatos, setCandidatos]     = useState([])
  const [loading, setLoading]           = useState(true)
  const [busca, setBusca]               = useState('')
  const [buscando, setBuscando]         = useState(false)
  const [filtroNivel, setFiltroNivel]   = useState('todos')
  const [filtroStatus, setFiltroStatus] = useState('aprovado')
  const [scoreMin, setScoreMin]         = useState(0)

  useEffect(() => { carregar() }, [])

  async function carregar() {
    setLoading(true)
    const { data } = await supabase
      .from('candidatos').select('*')
      .order('score_geral', { ascending: false })
    setCandidatos(data ?? [])
    setLoading(false)
  }

  async function buscarComIA() {
    if (!busca.trim()) return
    setBuscando(true)
    try {
      const filtros = await interpretarBusca(busca)
      setFiltroNivel(filtros.nivel === 'qualquer' ? 'todos' : filtros.nivel)
      setScoreMin(filtros.score_minimo || 0)
    } catch {}
    setBuscando(false)
  }

  async function converter(candidato) {
    const { data } = await supabase.from('colaboradores').insert({
      nome: candidato.nome,
      email: candidato.email,
      telefone: candidato.telefone,
      skills_json: candidato.skills_json,
      score_geral: candidato.score_geral,
      analise_json: candidato.analise_json,
    }).select().single()

    if (data) {
      await supabase.from('candidatos').update({
        status: 'convertido', colaborador_id: data.id
      }).eq('id', candidato.id)
      await carregar()
      navigate(`/colaboradores/${data.id}`)
    }
  }

  const filtrados = candidatos.filter(c => {
    const matchStatus = filtroStatus === 'todos' || c.status === filtroStatus
    const matchNivel  = filtroNivel === 'todos' || c.nivel === filtroNivel
    const matchScore  = c.score_geral >= scoreMin
    const matchBusca  = !busca || c.nome.toLowerCase().includes(busca.toLowerCase()) ||
                        (c.analise_json?.area_indicada || '').toLowerCase().includes(busca.toLowerCase())
    return matchStatus && matchNivel && matchScore && matchBusca
  })

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Banco de talentos</h1>
          <p className={styles.subtitle}>{filtrados.length} candidatos · {candidatos.filter(c=>c.status==='aprovado').length} aprovados</p>
        </div>
        <button className={styles.btnTriagem} onClick={() => navigate('/talentos/triagem')}>
          → Triagem
        </button>
      </div>

      {/* Busca IA */}
      <div className={styles.buscaBox}>
        <input
          className={styles.buscaInput}
          placeholder='Busca inteligente: "quero alguém organizado para fiscal"'
          value={busca}
          onChange={e => setBusca(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && buscarComIA()}
        />
        <button className={styles.btnBuscar} onClick={buscarComIA} disabled={buscando}>
          {buscando ? '⏳' : '🔍 Buscar com IA'}
        </button>
      </div>

      {/* Filtros */}
      <div className={styles.filtros}>
        {['aprovado','analisado','novo','todos'].map(s => (
          <button key={s}
            className={`${styles.filtro} ${filtroStatus === s ? styles.filtroOn : ''}`}
            onClick={() => setFiltroStatus(s)}
          >{s}</button>
        ))}
        <div className={styles.sep} />
        {['todos','iniciante','medio','avancado'].map(n => (
          <button key={n}
            className={`${styles.filtro} ${filtroNivel === n ? styles.filtroOn : ''}`}
            onClick={() => setFiltroNivel(n)}
          >{n}</button>
        ))}
        <div className={styles.sep} />
        <label className={styles.scoreLabel}>Score mín: {scoreMin}</label>
        <input type="range" min={0} max={90} step={5} value={scoreMin}
          onChange={e => setScoreMin(Number(e.target.value))} className={styles.scoreSlider} />
      </div>

      {loading ? <p className={styles.estado}>Carregando...</p>
      : filtrados.length === 0 ? <p className={styles.estado}>Nenhum candidato encontrado.</p>
      : (
        <div className={styles.grid}>
          {filtrados.map((c, i) => (
            <div key={c.id} className={styles.card}>
              <div className={styles.cardTopo}>
                <span className={styles.pos}>#{i+1}</span>
                <div className={styles.avatar}>{iniciais(c.nome)}</div>
                <div className={styles.cardInfo}>
                  <span className={styles.cardNome}>{c.nome}</span>
                  <span className={styles.cardArea}>{c.analise_json?.area_indicada || c.nivel || '—'}</span>
                  <span className={styles.cardEmail}>{c.email}</span>
                </div>
                <div className={`${styles.score} ${styles['score_' + cor(c.score_geral)]}`}>
                  <span className={styles.scoreNum}>{c.score_geral || '—'}</span>
                  <span className={styles.scoreLabel}>score</span>
                </div>
              </div>

              {c.skills_json && Object.keys(c.skills_json).length > 0 && (
                <div className={styles.skills}>
                  {SKILLS.map(s => {
                    const val = c.skills_json[s] ?? 0
                    return (
                      <div key={s} className={styles.skillRow}>
                        <span className={styles.skillLabel}>{s}</span>
                        <div className={styles.skillBar}>
                          <div className={`${styles.skillFill} ${styles['fill_' + cor(val)]}`} style={{ width: val+'%' }} />
                        </div>
                        <span className={styles.skillVal}>{val}</span>
                      </div>
                    )
                  })}
                </div>
              )}

              {c.analise_json?.perfil && (
                <p className={styles.perfil}>{c.analise_json.perfil}</p>
              )}

              <div className={styles.cardAcoes}>
                <span className={`${styles.statusBadge} ${styles['status_' + c.status]}`}>{c.status}</span>
                {c.status === 'aprovado' && (
                  <button className={styles.btnConverter} onClick={() => converter(c)}>
                    → Contratar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function iniciais(nome) { return (nome||'?').split(' ').slice(0,2).map(n=>n[0]).join('').toUpperCase() }
function cor(val) { return val >= 75 ? 'alto' : val >= 50 ? 'medio' : val > 0 ? 'baixo' : 'zero' }