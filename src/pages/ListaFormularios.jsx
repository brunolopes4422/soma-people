import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import styles from './ListaFormularios.module.css'

const TIPO_LABELS = {
  comportamental:     { label: 'Comportamental', cor: 'purple' },
  clima:              { label: 'Clima',           cor: 'blue'   },
  engajamento:        { label: 'Engajamento',     cor: 'green'  },
  avaliacao_skills:   { label: 'Skills',          cor: 'amber'  },
  triagem_candidato:  { label: 'Triagem',         cor: 'red'    },
  custom:             { label: 'Personalizado',   cor: 'gray'   },
}

export default function ListaFormularios() {
  const navigate = useNavigate()
  const { perfil } = useAuth()
  const [formularios, setFormularios] = useState([])
  const [loading, setLoading]         = useState(true)
  const [copiado, setCopiado]         = useState(null)

  useEffect(() => { carregar() }, [])

  async function carregar() {
    setLoading(true)
    const { data } = await supabase
      .from('formularios')
      .select('*, formulario_perguntas(count), formulario_convites(count)')
      .order('created_at', { ascending: false })
    setFormularios(data ?? [])
    setLoading(false)
  }

  async function toggleAtivo(id, ativo) {
    await supabase.from('formularios').update({ ativo: !ativo }).eq('id', id)
    await carregar()
  }

  function copiarLink(id, tipo) {
    const base = window.location.origin
    const link = tipo === 'publico'
      ? `${base}/form/${id}`
      : `${base}/formularios/${id}`
    navigator.clipboard.writeText(link)
    setCopiado(id + tipo)
    setTimeout(() => setCopiado(null), 2000)
  }

  const ativos   = formularios.filter(f => f.ativo).length
  const publicos = formularios.filter(f => f.publico).length

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Formulários</h1>
          <p className={styles.subtitle}>{formularios.length} criados · {ativos} ativos · {publicos} públicos</p>
        </div>
        <button className={styles.btnNovo} onClick={() => navigate('/formularios/novo')}>
          + Novo formulário
        </button>
      </div>

      {loading ? <p className={styles.estado}>Carregando...</p>
      : formularios.length === 0 ? (
        <div className={styles.vazio}>
          <p className={styles.vazioTitulo}>Nenhum formulário criado ainda</p>
          <p className={styles.vazioDesc}>Crie seu primeiro formulário para começar.</p>
          <button className={styles.btnNovo} onClick={() => navigate('/formularios/novo')}>
            + Criar primeiro formulário
          </button>
        </div>
      ) : (
        <div className={styles.lista}>
          {formularios.map(f => {
            const tipo = TIPO_LABELS[f.tipo] || TIPO_LABELS.custom
            const qtdPerguntas = f.formulario_perguntas?.[0]?.count ?? 0
            const qtdEnviados  = f.formulario_convites?.[0]?.count ?? 0
            const linkPublico  = `${window.location.origin}/form/${f.id}`
            return (
              <div key={f.id} className={`${styles.card} ${!f.ativo ? styles.cardInativo : ''}`}>

                {/* Info principal */}
                <div className={styles.cardMain} onClick={() => navigate(`/formularios/${f.id}`)}>
                  <div className={styles.cardTopo}>
                    <span className={`${styles.tipoBadge} ${styles['tipo_' + tipo.cor]}`}>{tipo.label}</span>
                    {f.publico && <span className={styles.publicoBadge}>🌐 Público</span>}
                    {!f.ativo && <span className={styles.inativoBadge}>Inativo</span>}
                  </div>
                  <h3 className={styles.cardTitulo}>{f.titulo}</h3>
                  {f.descricao && <p className={styles.cardDesc}>{f.descricao}</p>}
                  <p className={styles.cardMeta}>
                    {qtdPerguntas} pergunta{qtdPerguntas !== 1 ? 's' : ''}
                    {qtdEnviados > 0 && ` · ${qtdEnviados} resposta${qtdEnviados !== 1 ? 's' : ''}`}
                  </p>
                </div>

                {/* Link público */}
                {f.publico && f.ativo && (
                  <div className={styles.linkPublicoBox}>
                    <span className={styles.linkPublicoLabel}>🔗 Link público</span>
                    <span className={styles.linkPublicoUrl}>{linkPublico}</span>
                    <button
                      className={`${styles.btnCopiarLink} ${copiado === f.id + 'publico' ? styles.btnCopiado : ''}`}
                      onClick={() => copiarLink(f.id, 'publico')}
                    >
                      {copiado === f.id + 'publico' ? '✓ Copiado!' : 'Copiar'}
                    </button>
                  </div>
                )}

                {/* Ações */}
                <div className={styles.cardAcoes}>
                  <button className={styles.btnAcao} onClick={() => navigate(`/formularios/${f.id}`)}>
                    ✏️ Editar
                  </button>
                  <button className={styles.btnAcao} onClick={() => navigate(`/formularios/${f.id}/respostas`)}>
                    📋 Ver respostas {qtdEnviados > 0 && `(${qtdEnviados})`}
                  </button>
                  <button className={styles.btnAcao} onClick={() => navigate(`/formularios/${f.id}/enviar`)}>
                    📨 Enviar individual
                  </button>
                  <button className={styles.btnAcao} onClick={() => toggleAtivo(f.id, f.ativo)}>
                    {f.ativo ? '⏸ Desativar' : '▶ Ativar'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}