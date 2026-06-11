import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import styles from './EditorFormulario.module.css'

const TIPOS_PERGUNTA = [
  { id: 'texto_livre',    label: 'Texto livre'       },
  { id: 'multipla_escolha', label: 'Múltipla escolha' },
  { id: 'escala',         label: 'Escala (1-10)'     },
  { id: 'sim_nao',        label: 'Sim / Não'         },
  { id: 'ranking',        label: 'Ranking'           },
]

const TIPOS_FORM = [
  { id: 'comportamental',    label: 'Comportamental'  },
  { id: 'clima',             label: 'Clima'           },
  { id: 'engajamento',       label: 'Engajamento'     },
  { id: 'avaliacao_skills',  label: 'Avaliação de skills' },
  { id: 'triagem_candidato', label: 'Triagem de candidato' },
  { id: 'custom',            label: 'Personalizado'   },
]

const PERGUNTA_VAZIA = {
  texto: '', tipo: 'texto_livre', obrigatoria: true,
  opcoes: '', configuracao: {},
}

export default function EditorFormulario() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { perfil } = useAuth()
  const isEdicao = Boolean(id)

  const [form, setForm]           = useState({ titulo: '', descricao: '', tipo: 'comportamental', publico: false, ativo: true })
  const [perguntas, setPerguntas] = useState([])
  const [loading, setLoading]     = useState(isEdicao)
  const [salvando, setSalvando]   = useState(false)
  const [erro, setErro]           = useState('')
  const [abaAtiva, setAbaAtiva]   = useState('config') // config | perguntas | enviar

  useEffect(() => { if (isEdicao) carregar() }, [id])

  async function carregar() {
    setLoading(true)
    const { data: f } = await supabase.from('formularios').select('*').eq('id', id).single()
    if (f) setForm({ titulo: f.titulo, descricao: f.descricao || '', tipo: f.tipo, publico: f.publico, ativo: f.ativo })

    const { data: p } = await supabase
      .from('formulario_perguntas').select('*')
      .eq('formulario_id', id).order('ordem')
    setPerguntas(p?.map(p => ({
      ...p,
      opcoes: Array.isArray(p.opcoes) ? p.opcoes.join('\n') : (p.opcoes || ''),
    })) ?? [])
    setLoading(false)
  }

  function addPergunta() {
    setPerguntas(ps => [...ps, { ...PERGUNTA_VAZIA, id: 'novo_' + Date.now(), ordem: ps.length + 1 }])
  }

  function atualizarPergunta(idx, campo, valor) {
    setPerguntas(ps => ps.map((p, i) => i === idx ? { ...p, [campo]: valor } : p))
  }

  function removerPergunta(idx) {
    setPerguntas(ps => ps.filter((_, i) => i !== idx).map((p, i) => ({ ...p, ordem: i + 1 })))
  }

  function moverPergunta(idx, direcao) {
    const novas = [...perguntas]
    const alvo  = idx + direcao
    if (alvo < 0 || alvo >= novas.length) return
    ;[novas[idx], novas[alvo]] = [novas[alvo], novas[idx]]
    setPerguntas(novas.map((p, i) => ({ ...p, ordem: i + 1 })))
  }

  async function salvar() {
    if (!form.titulo.trim()) { setErro('Título é obrigatório.'); return }
    if (perguntas.length === 0) { setErro('Adicione pelo menos uma pergunta.'); return }
    setSalvando(true); setErro('')

    let formularioId = id
    if (isEdicao) {
      await supabase.from('formularios').update({ ...form }).eq('id', id)
    } else {
      const { data } = await supabase.from('formularios')
        .insert({ ...form, criado_por: perfil?.id }).select().single()
      formularioId = data?.id
    }

    if (!formularioId) { setErro('Erro ao salvar formulário.'); setSalvando(false); return }

    // Deleta perguntas antigas e recria
    await supabase.from('formulario_perguntas').delete().eq('formulario_id', formularioId)
    await supabase.from('formulario_perguntas').insert(
      perguntas.map((p, i) => ({
        formulario_id: formularioId,
        texto: p.texto,
        tipo: p.tipo,
        obrigatoria: p.obrigatoria,
        ordem: i + 1,
        opcoes: p.opcoes ? p.opcoes.split('\n').map(o => o.trim()).filter(Boolean) : null,
        configuracao: p.configuracao || {},
      }))
    )

    navigate('/formularios')
  }

  if (loading) return <p className={styles.estado}>Carregando...</p>

  return (
    <div className={styles.page}>
      <button className={styles.voltar} onClick={() => navigate('/formularios')}>← Voltar</button>
      <div className={styles.pageHeader}>
        <h1 className={styles.title}>{isEdicao ? 'Editar formulário' : 'Novo formulário'}</h1>
        <button className={styles.btnSalvar} onClick={salvar} disabled={salvando}>
          {salvando ? 'Salvando...' : '✓ Salvar'}
        </button>
      </div>

      {/* Abas */}
      <div className={styles.abas}>
        {[
          { id: 'config',    label: 'Configurações' },
          { id: 'perguntas', label: `Perguntas (${perguntas.length})` },
          ...(isEdicao ? [{ id: 'enviar', label: 'Enviar' }] : []),
        ].map(a => (
          <button key={a.id}
            className={`${styles.aba} ${abaAtiva === a.id ? styles.abaAtiva : ''}`}
            onClick={() => setAbaAtiva(a.id)}
          >{a.label}</button>
        ))}
      </div>

      {/* Config */}
      {abaAtiva === 'config' && (
        <div className={styles.card}>
          <div className={styles.campos}>
            <div className={styles.campo}>
              <label>Título *</label>
              <input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                placeholder="Ex: Avaliação comportamental Q1 2025" />
            </div>
            <div className={styles.campo}>
              <label>Descrição</label>
              <textarea rows={2} value={form.descricao}
                onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                placeholder="Explique o objetivo do formulário..." />
            </div>
            <div className={styles.grid2}>
              <div className={styles.campo}>
                <label>Tipo</label>
                <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
                  {TIPOS_FORM.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </div>
              <div className={styles.campo}>
                <label>Status</label>
                <select value={form.ativo ? 'ativo' : 'inativo'}
                  onChange={e => setForm(f => ({ ...f, ativo: e.target.value === 'ativo' }))}>
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                </select>
              </div>
            </div>
            <div className={styles.toggle}>
              <input type="checkbox" id="publico" checked={form.publico}
                onChange={e => setForm(f => ({ ...f, publico: e.target.checked }))} />
              <label htmlFor="publico">
                <strong>Formulário público</strong> — pode ser respondido via link sem login
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Perguntas */}
      {abaAtiva === 'perguntas' && (
        <div className={styles.perguntasArea}>
          {perguntas.length === 0 && (
            <div className={styles.semPerguntas}>
              <p>Nenhuma pergunta ainda.</p>
              <p className={styles.semPerguntasDica}>Clique em "Adicionar pergunta" para começar.</p>
            </div>
          )}

          {perguntas.map((p, idx) => (
            <div key={p.id || idx} className={styles.perguntaCard}>
              <div className={styles.perguntaHeader}>
                <span className={styles.perguntaNum}>#{idx + 1}</span>
                <div className={styles.perguntaAcoes}>
                  <button className={styles.btnMover} onClick={() => moverPergunta(idx, -1)} disabled={idx === 0}>↑</button>
                  <button className={styles.btnMover} onClick={() => moverPergunta(idx, 1)} disabled={idx === perguntas.length - 1}>↓</button>
                  <button className={styles.btnRemover} onClick={() => removerPergunta(idx)}>✕</button>
                </div>
              </div>

              <div className={styles.campo}>
                <label>Pergunta *</label>
                <textarea rows={2} value={p.texto}
                  onChange={e => atualizarPergunta(idx, 'texto', e.target.value)}
                  placeholder="Digite a pergunta..." />
              </div>

              <div className={styles.grid2}>
                <div className={styles.campo}>
                  <label>Tipo de resposta</label>
                  <select value={p.tipo} onChange={e => atualizarPergunta(idx, 'tipo', e.target.value)}>
                    {TIPOS_PERGUNTA.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                </div>
                <div className={styles.toggleInline}>
                  <input type="checkbox" id={`obr_${idx}`} checked={p.obrigatoria}
                    onChange={e => atualizarPergunta(idx, 'obrigatoria', e.target.checked)} />
                  <label htmlFor={`obr_${idx}`}>Obrigatória</label>
                </div>
              </div>

              {p.tipo === 'multipla_escolha' && (
                <div className={styles.campo}>
                  <label>Opções (uma por linha)</label>
                  <textarea rows={4} value={p.opcoes}
                    onChange={e => atualizarPergunta(idx, 'opcoes', e.target.value)}
                    placeholder="Opção 1&#10;Opção 2&#10;Opção 3" />
                </div>
              )}

              {p.tipo === 'escala' && (
                <div className={styles.escalaConfig}>
                  <p className={styles.escalaInfo}>📊 Escala de 1 a 10 — o respondente escolhe um valor numérico.</p>
                </div>
              )}
            </div>
          ))}

          <button className={styles.btnAddPergunta} onClick={addPergunta}>
            + Adicionar pergunta
          </button>
        </div>
      )}

      {/* Enviar */}
      {abaAtiva === 'enviar' && isEdicao && (
        <EnviarFormulario formularioId={id} formulario={form} />
      )}

      {erro && <p className={styles.erro}>{erro}</p>}
    </div>
  )
}

// ── Aba Enviar ────────────────────────────────────────────────────

function EnviarFormulario({ formularioId, formulario }) {
  const [colaboradores, setColaboradores] = useState([])
  const [selecionados, setSelecionados]   = useState([])
  const [enviando, setEnviando]           = useState(false)
  const [enviados, setEnviados]           = useState([])
  const [busca, setBusca]                 = useState('')
  const [convites, setConvites]           = useState([])

  useEffect(() => {
    supabase.from('colaboradores').select('id,nome,cargo,departamento')
      .eq('status','ativo').order('nome')
      .then(({ data }) => setColaboradores(data ?? []))

    supabase.from('formulario_convites').select('*,colaborador:colaboradores(nome)')
      .eq('formulario_id', formularioId).order('created_at', { ascending: false })
      .then(({ data }) => setConvites(data ?? []))
  }, [formularioId])

  function toggleSelecionado(id) {
    setSelecionados(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])
  }

  async function enviarConvites() {
    if (selecionados.length === 0) return
    setEnviando(true)
    const inserir = selecionados.map(colaborador_id => ({
      formulario_id: formularioId,
      colaborador_id,
      expira_em: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    }))
    const { data } = await supabase.from('formulario_convites').insert(inserir).select()
    setEnviados(data?.map(c => c.id) ?? [])
    setSelecionados([])
    const { data: novosConvites } = await supabase
      .from('formulario_convites').select('*,colaborador:colaboradores(nome)')
      .eq('formulario_id', formularioId).order('created_at', { ascending: false })
    setConvites(novosConvites ?? [])
    setEnviando(false)
  }

  const filtrados = colaboradores.filter(c =>
    c.nome.toLowerCase().includes(busca.toLowerCase()) ||
    (c.departamento || '').toLowerCase().includes(busca.toLowerCase())
  )

  const baseUrl = window.location.origin

  return (
    <div className={styles.enviarArea}>

      {/* Selecionar colaboradores */}
      <div className={styles.card}>
        <p className={styles.secaoTitulo}>Selecionar colaboradores</p>
        <input className={styles.buscaInput} placeholder="Buscar colaborador..."
          value={busca} onChange={e => setBusca(e.target.value)} />
        <div className={styles.colaboradoresList}>
          {filtrados.map(c => (
            <label key={c.id} className={`${styles.colaboradorItem} ${selecionados.includes(c.id) ? styles.colaboradorSelecionado : ''}`}>
              <input type="checkbox" checked={selecionados.includes(c.id)}
                onChange={() => toggleSelecionado(c.id)} />
              <span className={styles.colaboradorNome}>{c.nome}</span>
              <span className={styles.colaboradorDept}>{c.departamento}</span>
            </label>
          ))}
        </div>
        {selecionados.length > 0 && (
          <button className={styles.btnEnviarConvites} onClick={enviarConvites} disabled={enviando}>
            {enviando ? 'Gerando links...' : `Gerar links para ${selecionados.length} colaborador${selecionados.length > 1 ? 'es' : ''}`}
          </button>
        )}
      </div>

      {/* Convites gerados */}
      {convites.length > 0 && (
        <div className={styles.card}>
          <p className={styles.secaoTitulo}>Links gerados</p>
          <div className={styles.convitesList}>
            {convites.map(c => (
              <div key={c.id} className={styles.conviteItem}>
                <div className={styles.conviteInfo}>
                  <span className={styles.conviteNome}>{c.colaborador?.nome}</span>
                  <span className={`${styles.conviteStatus} ${styles['convite_' + c.status]}`}>{c.status}</span>
                </div>
                <div className={styles.conviteLink}>
                  <input readOnly value={`${baseUrl}/f/${c.token}`} className={styles.linkInput} />
                  <button className={styles.btnCopiar}
                    onClick={() => navigator.clipboard.writeText(`${baseUrl}/f/${c.token}`)}>
                    Copiar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}