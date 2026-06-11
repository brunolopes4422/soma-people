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

  useEffect(() => { carregar() }, [])

  async function carregar() {
    setLoading(true)
    const { data } = await supabase
      .from('formularios')
      .select('*, formulario_perguntas(count)')
      .order('created_at', { ascending: false })
    setFormularios(data ?? [])
    setLoading(false)
  }

  async function toggleAtivo(id, ativo) {
    await supabase.from('formularios').update({ ativo: !ativo }).eq('id', id)
    await carregar()
  }

  async function duplicar(f) {
    const { data: novo } = await supabase.from('formularios').insert({
      titulo: f.titulo + ' (cópia)',
      descricao: f.descricao,
      tipo: f.tipo,
      publico: false,
      ativo: false,
      configuracao: f.configuracao,
      criado_por: perfil?.id,
    }).select().single()

    if (novo) {
      const { data: perguntas } = await supabase
        .from('formulario_perguntas')
        .select('*')
        .eq('formulario_id', f.id)
        .order('ordem')

      if (perguntas?.length) {
        await supabase.from('formulario_perguntas').insert(
          perguntas.map(p => ({
            formulario_id: novo.id,
            texto: p.texto,
            tipo: p.tipo,
            obrigatoria: p.obrigatoria,
            ordem: p.ordem,
            opcoes: p.opcoes,
            configuracao: p.configuracao,
          }))
        )
      }
      navigate(`/formularios/${novo.id}`)
    }
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
          <p className={styles.vazioDesc}>Crie seu primeiro formulário para começar a avaliar colaboradores e candidatos.</p>
          <button className={styles.btnNovo} onClick={() => navigate('/formularios/novo')}>
            + Criar primeiro formulário
          </button>
        </div>
      ) : (
        <div className={styles.lista}>
          {formularios.map(f => {
            const tipo = TIPO_LABELS[f.tipo] || TIPO_LABELS.custom
            const qtdPerguntas = f.formulario_perguntas?.[0]?.count ?? 0
            return (
              <div key={f.id} className={`${styles.card} ${!f.ativo ? styles.cardInativo : ''}`}>
                <div className={styles.cardMain} onClick={() => navigate(`/formularios/${f.id}`)}>
                  <div className={styles.cardTopo}>
                    <span className={`${styles.tipoBadge} ${styles['tipo_' + tipo.cor]}`}>{tipo.label}</span>
                    {f.publico && <span className={styles.publicoBadge}>🌐 Público</span>}
                    {!f.ativo && <span className={styles.inativoBadge}>Inativo</span>}
                  </div>
                  <h3 className={styles.cardTitulo}>{f.titulo}</h3>
                  {f.descricao && <p className={styles.cardDesc}>{f.descricao}</p>}
                  <p className={styles.cardMeta}>{qtdPerguntas} pergunta{qtdPerguntas !== 1 ? 's' : ''}</p>
                </div>
                <div className={styles.cardAcoes}>
                  <button className={styles.btnAcao} onClick={() => navigate(`/formularios/${f.id}`)}>
                    ✏️ Editar
                  </button>
                  <button className={styles.btnAcao} onClick={() => duplicar(f)}>
                    📋 Duplicar
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