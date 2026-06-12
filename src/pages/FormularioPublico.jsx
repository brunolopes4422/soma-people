import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import styles from './FormularioPublico.module.css'

export default function FormularioPublico() {
  const { slug } = useParams()
  const [etapa, setEtapa]       = useState('identificacao')
  const [formulario, setFormulario] = useState(null)
  const [perguntas, setPerguntas]   = useState([])
  const [respostas, setRespostas]   = useState({})
  const [perguntaAtual, setPerguntaAtual] = useState(0)
  const [loading, setLoading]   = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro]         = useState('')
  const [respondente, setRespondente] = useState({ nome: '', whatsapp: '' })
  const [colaboradorId, setColaboradorId] = useState(null)

  useEffect(() => { carregar() }, [slug])

  async function carregar() {
    setLoading(true)
    const { data: f } = await supabase
      .from('formularios').select('*')
      .eq('id', slug).eq('publico', true).eq('ativo', true)
      .single()
    if (!f) { setErro('Formulário não encontrado ou indisponível.'); setLoading(false); return }
    setFormulario(f)
    const { data: p } = await supabase
      .from('formulario_perguntas').select('*')
      .eq('formulario_id', f.id).order('ordem')
    setPerguntas(p ?? [])
    setLoading(false)
  }

  async function identificar() {
    if (!respondente.nome.trim() || !respondente.whatsapp.trim()) {
      setErro('Preencha seu nome e WhatsApp.'); return
    }
    setErro('')
    const whatsapp = respondente.whatsapp.replace(/\D/g, '')

    const { data: jaRespondeu } = await supabase
      .from('formulario_convites').select('id')
      .eq('formulario_id', formulario.id)
      .eq('status', 'respondido')
      .ilike('email_destinatario', `%${whatsapp}%`)
      .maybeSingle()

    if (jaRespondeu) {
      setErro('Você já respondeu este formulário. Obrigado!')
      return
    }

    const { data: colab } = await supabase
      .from('colaboradores').select('id, nome')
      .ilike('whatsapp', `%${whatsapp}%`)
      .maybeSingle()

    if (colab) setColaboradorId(colab.id)
    setPerguntaAtual(0)
    setEtapa('perguntas')
  }

  function responderAtual(valor) {
    const p = perguntas[perguntaAtual]
    setRespostas(r => ({ ...r, [p.id]: valor }))
  }

  function avancar() {
    const p = perguntas[perguntaAtual]
    if (p.obrigatoria && !respostas[p.id]) {
      setErro('Por favor responda esta pergunta.'); return
    }
    setErro('')
    if (perguntaAtual < perguntas.length - 1) {
      setPerguntaAtual(i => i + 1)
    } else {
      enviar()
    }
  }

  function voltar() {
    setErro('')
    if (perguntaAtual > 0) setPerguntaAtual(i => i - 1)
    else setEtapa('identificacao')
  }

  async function enviar() {
    setEnviando(true); setErro('')
    try {
      const { data: convite, error: errConvite } = await supabase
        .from('formulario_convites')
        .insert({
          formulario_id:      formulario.id,
          colaborador_id:     colaboradorId || null,
          nome_destinatario:  respondente.nome,
          email_destinatario: respondente.whatsapp.replace(/\D/g, ''),
          status:             'respondido',
          respondido_em:      new Date().toISOString(),
        })
        .select().single()

      if (errConvite || !convite) throw new Error(errConvite?.message || 'Erro ao registrar.')

      const { error: errResp } = await supabase.from('formulario_respostas').insert(
        perguntas.map(p => ({
          convite_id:      convite.id,
          formulario_id:   formulario.id,
          pergunta_id:     p.id,
          resposta_texto:  p.tipo === 'texto_livre' ? respostas[p.id] || null : null,
          resposta_numero: p.tipo === 'escala' ? Number(respostas[p.id]) || null : null,
          resposta_opcao:  ['multipla_escolha','sim_nao'].includes(p.tipo) ? respostas[p.id] || null : null,
        }))
      )

      if (errResp) throw new Error(errResp.message)
      setEtapa('sucesso')
    } catch (e) {
      setErro('Erro ao enviar: ' + e.message)
      setEnviando(false)
    }
  }

  // ── Loading / Erro / Sucesso ──────────────────────────────────

  if (loading) return (
    <div className={styles.page}>
      <div className={styles.container}>
        <p className={styles.carregando}>Carregando...</p>
      </div>
    </div>
  )

  if (erro && !formulario) return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.resultadoCard}>
          <span className={styles.resultadoIcone}>⚠️</span>
          <h2 className={styles.resultadoTitulo}>{erro}</h2>
        </div>
      </div>
    </div>
  )

  if (etapa === 'sucesso') return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.resultadoCard}>
          <span className={styles.resultadoIcone}>✓</span>
          <h2 className={styles.resultadoTitulo}>Respostas enviadas!</h2>
          <p className={styles.resultadoDesc}>
            Obrigado, <strong>{respondente.nome.split(' ')[0]}</strong>!
            Suas respostas foram registradas com sucesso.
          </p>
        </div>
      </div>
    </div>
  )

  const p = perguntas[perguntaAtual]
  const respondidas = perguntas.filter(p => respostas[p.id] !== undefined).length
  const progresso   = Math.round((respondidas / perguntas.length) * 100)

  // ── Identificação ─────────────────────────────────────────────

  if (etapa === 'identificacao') return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.logo}>
          <span className={styles.logoIcone}>◆</span>
          <span className={styles.logoNome}>Soma</span>
        </div>
        <div className={styles.formularioInfo}>
          <h1 className={styles.formularioTitulo}>{formulario?.titulo}</h1>
          {formulario?.descricao && <p className={styles.formularioDesc}>{formulario.descricao}</p>}
          <p className={styles.formularioCount}>{perguntas.length} perguntas</p>
        </div>
        <div className={styles.card}>
          <h2 className={styles.cardTitulo}>Antes de começar</h2>
          <p className={styles.cardDesc}>Precisamos te identificar para registrar suas respostas corretamente.</p>
          <div className={styles.campos}>
            <div className={styles.campo}>
              <label>Nome completo *</label>
              <input
                value={respondente.nome}
                onChange={e => setRespondente(r => ({ ...r, nome: e.target.value }))}
                placeholder="Seu nome completo"
                onKeyDown={e => e.key === 'Enter' && identificar()}
                autoFocus
              />
            </div>
            <div className={styles.campo}>
              <label>WhatsApp *</label>
              <input
                value={respondente.whatsapp}
                onChange={e => setRespondente(r => ({ ...r, whatsapp: e.target.value }))}
                placeholder="(00) 99999-9999"
                onKeyDown={e => e.key === 'Enter' && identificar()}
              />
            </div>
          </div>
          {erro && <p className={styles.erro}>{erro}</p>}
          <button className={styles.btnPrimario} onClick={identificar}>
            Começar →
          </button>
        </div>
        <p className={styles.rodape}>Suas respostas são tratadas com sigilo.</p>
      </div>
    </div>
  )

  // ── Perguntas (uma por vez) ───────────────────────────────────

  return (
    <div className={styles.page}>
      <div className={styles.container}>

        {/* Header */}
        <div className={styles.perguntaHeader}>
          <div className={styles.logo}>
            <span className={styles.logoIcone}>◆</span>
            <span className={styles.logoNome}>Soma</span>
          </div>
          <span className={styles.perguntaContador}>
            {perguntaAtual + 1} / {perguntas.length}
          </span>
        </div>

        {/* Barra de progresso */}
        <div className={styles.progressoBar}>
          <div className={styles.progressoFill} style={{ width: `${((perguntaAtual) / perguntas.length) * 100}%` }} />
        </div>

        {/* Card da pergunta */}
        <div className={styles.card}>
          <p className={styles.perguntaNum}>Pergunta {perguntaAtual + 1}</p>
          <h2 className={styles.perguntaTexto}>{p.texto}</h2>

          {/* Múltipla escolha */}
          {p.tipo === 'multipla_escolha' && (
            <div className={styles.opcoes}>
              {(Array.isArray(p.opcoes) ? p.opcoes : []).map((op, i) => (
                <button
                  key={op}
                  className={`${styles.opcao} ${respostas[p.id] === op ? styles.opcaoSelecionada : ''}`}
                  onClick={() => { responderAtual(op); setErro('') }}
                >
                  <span className={styles.opcaoLetra}>{String.fromCharCode(65 + i)}</span>
                  <span className={styles.opcaoTexto}>{op}</span>
                </button>
              ))}
            </div>
          )}

          {/* Sim / Não */}
          {p.tipo === 'sim_nao' && (
            <div className={styles.simNao}>
              {['Sim', 'Não'].map(op => (
                <button
                  key={op}
                  className={`${styles.btnSimNao} ${respostas[p.id] === op ? styles.opcaoSelecionada : ''}`}
                  onClick={() => { responderAtual(op); setErro('') }}
                >{op}</button>
              ))}
            </div>
          )}

          {/* Texto livre */}
          {p.tipo === 'texto_livre' && (
            <textarea
              className={styles.textareaLivre}
              rows={4}
              value={respostas[p.id] || ''}
              onChange={e => responderAtual(e.target.value)}
              placeholder="Sua resposta..."
              autoFocus
            />
          )}

          {/* Escala */}
          {p.tipo === 'escala' && (
            <div className={styles.escala}>
              <div className={styles.escalaOpcoes}>
                {[1,2,3,4,5,6,7,8,9,10].map(n => (
                  <button
                    key={n}
                    className={`${styles.escalaBotao} ${respostas[p.id] === n ? styles.opcaoSelecionada : ''}`}
                    onClick={() => { responderAtual(n); setErro('') }}
                  >{n}</button>
                ))}
              </div>
              <div className={styles.escalaLabels}>
                <span>Discordo totalmente</span>
                <span>Concordo totalmente</span>
              </div>
            </div>
          )}

          {erro && <p className={styles.erro}>{erro}</p>}

          {/* Navegação */}
          <div className={styles.navegacao}>
            <button className={styles.btnSecundario} onClick={voltar}>
              ← Voltar
            </button>
            <button
              className={styles.btnPrimario}
              onClick={avancar}
              disabled={enviando}
            >
              {enviando ? '⏳ Enviando...'
                : perguntaAtual === perguntas.length - 1 ? '✓ Concluir'
                : 'Próxima →'}
            </button>
          </div>
        </div>

        {/* Rodapé com bolinhas de progresso */}
        <div className={styles.bolinhas}>
          {perguntas.map((pq, i) => (
            <div
              key={pq.id}
              className={`${styles.bolinha}
                ${i === perguntaAtual ? styles.bolinhaAtual : ''}
                ${respostas[pq.id] ? styles.bolinhaRespondida : ''}
              `}
              title={`Pergunta ${i + 1}${respostas[pq.id] ? ' ✓' : ''}`}
            />
          ))}
        </div>

      </div>
    </div>
  )
}