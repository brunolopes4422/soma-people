import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { PERFIS } from '../../lib/permissoes'
import styles from './ConfigTalent.module.css'

const SKILLS = [
  { id: 'comunicacao',  label: 'Comunicação',  desc: 'Clareza, escuta, relacionamento interpessoal' },
  { id: 'organizacao',  label: 'Organização',  desc: 'Planejamento, gestão de tempo, processos' },
  { id: 'lideranca',    label: 'Liderança',    desc: 'Influência, tomada de decisão, gestão de pessoas' },
  { id: 'tecnico',      label: 'Técnico',      desc: 'Conhecimento específico da área, ferramentas' },
  { id: 'proatividade', label: 'Proatividade', desc: 'Iniciativa, antecipação, resolução de problemas' },
]

const DEFAULT_CONFIG = {
  peso_comunicacao:   1.0,
  peso_organizacao:   1.0,
  peso_lideranca:     0.7,
  peso_tecnico:       1.0,
  peso_proatividade:  0.9,
  score_minimo:       50,
  analise_automatica: true,
}

export default function ConfigTalent() {
  const { perfil } = useAuth()
  const navigate   = useNavigate()

  const [config, setConfig]   = useState(DEFAULT_CONFIG)
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [ok, setOk]           = useState('')

  useEffect(() => {
    if (perfil?.perfil !== PERFIS.SUPER_ADMIN) { navigate('/talentos'); return }
    carregar()
  }, [perfil])

  async function carregar() {
    const { data } = await supabase.from('talent_config').select('*').eq('id', 1).single()
    if (data) setConfig(data)
    setLoading(false)
  }

  function atualizar(campo, valor) {
    setConfig(c => ({ ...c, [campo]: valor }))
  }

  async function salvar() {
    setSalvando(true); setOk('')
    await supabase.from('talent_config').upsert({ ...config, id: 1, updated_at: new Date().toISOString() })
    setOk('Configurações salvas com sucesso.')
    setSalvando(false)
    setTimeout(() => setOk(''), 3000)
  }

  if (loading) return <p className={styles.estado}>Carregando...</p>

  const pesoTotal = SKILLS.reduce((acc, s) => acc + Number(config[`peso_${s.id}`] || 0), 0)

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Configurações — Talent Pool</h1>
          <p className={styles.subtitle}>Ajuste os pesos das skills e critérios de análise</p>
        </div>
        <div className={styles.acoes}>
          {ok && <span className={styles.ok}>{ok}</span>}
          <button className={styles.btnSalvar} onClick={salvar} disabled={salvando}>
            {salvando ? 'Salvando...' : 'Salvar configurações'}
          </button>
        </div>
      </div>

      {/* Pesos das skills */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Pesos das skills na busca</h2>
          <p className={styles.cardDesc}>
            Define a importância relativa de cada skill quando você faz uma busca manual (sem texto em linguagem natural).
            Total atual: <strong>{pesoTotal.toFixed(1)}</strong>
          </p>
        </div>
        <div className={styles.skillsGrid}>
          {SKILLS.map(s => {
            const val = Number(config[`peso_${s.id}`] || 0)
            return (
              <div key={s.id} className={styles.skillItem}>
                <div className={styles.skillInfo}>
                  <span className={styles.skillLabel}>{s.label}</span>
                  <span className={styles.skillDesc}>{s.desc}</span>
                </div>
                <div className={styles.sliderRow}>
                  <input
                    type="range"
                    min={0} max={2} step={0.1}
                    value={val}
                    onChange={e => atualizar(`peso_${s.id}`, parseFloat(e.target.value))}
                    className={styles.slider}
                  />
                  <span className={styles.sliderVal}>{val.toFixed(1)}</span>
                </div>
                {/* Barra visual do peso */}
                <div className={styles.pesoBar}>
                  <div className={styles.pesoFill} style={{ width: (val / 2 * 100) + '%' }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Score mínimo */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Score mínimo aceitável</h2>
          <p className={styles.cardDesc}>
            Candidatos abaixo deste score são sinalizados visualmente no painel.
          </p>
        </div>
        <div className={styles.scoreRow}>
          <input
            type="range"
            min={0} max={90} step={5}
            value={config.score_minimo}
            onChange={e => atualizar('score_minimo', Number(e.target.value))}
            className={styles.slider}
          />
          <div className={`${styles.scoreBadge} ${config.score_minimo >= 70 ? styles.scoreAlto : config.score_minimo >= 40 ? styles.scoreMedio : styles.scoreBaixo}`}>
            {config.score_minimo}
          </div>
        </div>
        <p className={styles.scoreHint}>
          {config.score_minimo >= 70 ? 'Critério alto — poucos candidatos vão passar.' :
           config.score_minimo >= 40 ? 'Critério moderado — equilibrado.' :
           'Critério baixo — maioria dos candidatos passa.'}
        </p>
      </div>

      {/* Análise automática */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Análise automática com IA</h2>
          <p className={styles.cardDesc}>
            Quando ativado, a IA analisa o candidato automaticamente assim que ele envia a candidatura.
            Desative se quiser analisar manualmente para economizar chamadas de API.
          </p>
        </div>
        <label className={styles.toggle}>
          <div className={`${styles.toggleTrack} ${config.analise_automatica ? styles.toggleOn : ''}`}>
            <input
              type="checkbox"
              checked={config.analise_automatica}
              onChange={e => atualizar('analise_automatica', e.target.checked)}
              className={styles.toggleInput}
            />
            <div className={styles.toggleThumb} />
          </div>
          <div>
            <span className={styles.toggleLabel}>
              {config.analise_automatica ? 'Análise automática ativada' : 'Análise manual — você decide quando analisar'}
            </span>
            <span className={styles.toggleHint}>
              {config.analise_automatica
                ? 'Cada candidatura vai consumir uma chamada à API Claude.'
                : 'Candidatos ficam com status "novo" até você clicar em "Analisar com IA".'}
            </span>
          </div>
        </label>
      </div>

      {/* Preview da fórmula */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Fórmula de match atual</h2>
          <p className={styles.cardDesc}>Como o score de match é calculado na busca manual.</p>
        </div>
        <div className={styles.formula}>
          {SKILLS.map((s, i) => {
            const peso = Number(config[`peso_${s.id}`] || 0)
            return (
              <span key={s.id} className={styles.formulaTermo}>
                <span className={styles.formulaSkill}>{s.label}</span>
                <span className={styles.formulaOp}>×</span>
                <span className={styles.formulaPeso}>{peso.toFixed(1)}</span>
                {i < SKILLS.length - 1 && <span className={styles.formulaPlus}>+</span>}
              </span>
            )
          })}
        </div>
      </div>
    </div>
  )
}
