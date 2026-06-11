import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import styles from './TrabalheConosco.module.css'

export default function FormularioPublico() {
  const { slug } = useParams() // pode ser o ID ou slug do formulário
  const [etapa, setEtapa]         = useState('identificacao') // identificacao | perguntas | sucesso
  const [formulario, setFormulario] = useState(null)
  const [perguntas, setPerguntas] = useState([])
  const [respostas, setRespostas] = useState({})
  const [loading, setLoading]     = useState(true)
  const [enviando, setEnviando]   = useState(false)
  const [erro, setErro]           = useState('')
  const [respondente, setRespondente] = useState({ nome: '', whatsapp: '' })
  const [colaboradorId, setColaboradorId] = useState(null)

  useEffect(() => { carregar() }, [slug])

  async function carregar() {
    setLoading(true)
    // Busca por ID ou por título slugificado
    const { data: f } = await supabase
      .from('formularios')
      .select('*')
      .eq('id', slug)
      .eq('publico', true)
      .eq('ativo', true)
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

    // Busca colaborador pelo whatsapp
    const whatsapp = respondente.whatsapp.replace(/\D/g, '')
    const { data: colab } = await supabase
      .from('colaboradores')
      .select('id, nome')
      .ilike('whatsapp', `%${whatsapp}%`)
      .single()

    if (colab) setColaboradorId(colab.id)
    setEtapa('perguntas')
  }

  function atualizar(id, valor) {
    setRespostas(r => ({ ...r, [id]: valor }))
  }

  async function enviar() {
    const obrigatorias = perguntas.filter(p => p.obrigatoria)
    const faltando = obrigatorias.filter(p => !respostas[p.id]?.toString().trim())
    if (faltando.length > 0) { setErro('Responda todas as perguntas obrigatórias.'); return }

    setEnviando(true); setErro('')
    try {
      // Cria convite automático
      const { data: convite } = await supabase
        .from('formulario_convites')
        .insert({
          formulario_id:     formulario.id,
          colaborador_id:    colaboradorId || null,
          nome_destinatario: respondente.nome,
          email_destinatario: respondente.whatsapp,
          status:            'respondido',
          respondido_em:     new Date().toISOString(),
        })
        .select().single()

      if (!convite) throw new Error('Erro ao registrar resposta.')

      // Salva respostas
      await supabase.from('formulario_respostas').insert(
        perguntas.map(p => ({
          convite_id:    convite.id,
          formulario_id: formulario.id,
          pergunta_id:   p.id,
          resposta_texto:  p.tipo === 'texto_livre' ? respostas[p.id] : null,
          resposta_numero: p.tipo === 'escala' ? Number(respostas[p.id]) : null,
          resposta_opcao:  ['multipla_escolha','sim_nao'].includes(p.tipo) ? respostas[p.id] : null,
        }))
      )

      setEtapa('sucesso')
    } catch (e) { setErro('Erro ao enviar: ' + e.message) }
    setEnviando(false)
  }

  if (loading) return (
    <div className={styles.page}>
      <div className={styles.container}>
        <p style={{ color: '#808080', textAlign: 'center', paddingTop: '4rem' }}>Carregando...</p>
      </div>
    </div>
  )

  if (erro && !formulario) return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.sucessoCard}>
          <div style={{ fontSize: '28px' }}>⚠️</div>
          <h2 className={styles.sucessoTitulo}>{erro}</h2>
        </div>
      </div>
    </div>
  )

  if (etapa === 'sucesso') return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.sucessoCard}>
          <div className={styles.sucessoIcon}>✓</div>
          <h2 className={styles.sucessoTitulo}>Respostas enviadas!</h2>
          <p className={styles.sucessoTexto}>
            Obrigado, <strong>{respondente.nome}</strong>! Suas respostas foram registradas com sucesso.
          </p>
        </div>
      </div>
    </div>
  )

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.logo}>
            <span className={styles.logoIcon}>◆</span>
            <span className={styles.logoText}>Soma</span>
          </div>
          <h1 className={styles.titulo}>{formulario?.titulo}</h1>
          {formulario?.descricao && (
            <p className={styles.subtitulo}>{formulario.descricao}</p>
          )}
        </div>

        <div className={styles.card}>

          {/* Etapa 1 — Identificação */}
          {etapa === 'identificacao' && (
            <div className={styles.etapaConteudo}>
              <h2 className={styles.etapaTitulo}>Antes de começar</h2>
              <p className={styles.etapaDesc}>Precisamos identificar você para vincular suas respostas corretamente.</p>
              <div className={styles.campos}>
                <div className={styles.campo}>
                  <label className={styles.campoLabel}>Nome completo *</label>
                  <input
                    className={styles.campoInput}
                    value={respondente.nome}
                    onChange={e => setRespondente(r => ({ ...r, nome: e.target.value }))}
                    placeholder="Seu nome completo"
                    autoFocus
                  />
                </div>
                <div className={styles.campo}>
                  <label className={styles.campoLabel}>WhatsApp *</label>
                  <input
                    className={styles.campoInput}
                    value={respondente.whatsapp}
                    onChange={e => setRespondente(r => ({ ...r, whatsapp: e.target.value }))}
                    placeholder="(00) 99999-9999"
                  />
                </div>
              </div>
              {erro && <p className={styles.erro}>{erro}</p>}
              <div className={styles.navegacao}>
                <button className={styles.btnAvancar} onClick={identificar}>
                  Continuar →
                </button>
              </div>
            </div>
          )}

          {/* Etapa 2 — Perguntas */}
          {etapa === 'perguntas' && (
            <div className={styles.etapaConteudo}>
              <h2 className={styles.etapaTitulo}>Olá, {respondente.nome.split(' ')[0]}!</h2>
              <p className={styles.etapaDesc}>
                Responda com sinceridade — não há respostas certas ou erradas.
              </p>
              <div className={styles.campos}>
                {perguntas.map((p, idx) => (
                  <div key={p.id} className={styles.pergunta}>
                    <label className={styles.perguntaLabel}>
                      <span className={styles.perguntaNum}>{idx + 1}</span>
                      {p.texto}
                      {p.obrigatoria && <span className={styles.obrigatorio}> *</span>}
                    </label>

                    {p.tipo === 'texto_livre' && (
                      <textarea className={styles.perguntaInput} rows={3}
                        value={respostas[p.id] || ''}
                        onChange={e => atualizar(p.id, e.target.value)}
                        placeholder="Sua resposta..." />
                    )}

                    {p.tipo === 'multipla_escolha' && (
                      <div className={styles.opcoes}>
                        {(Array.isArray(p.opcoes) ? p.opcoes : []).map(op => (
                          <label key={op} className={`${styles.opcao} ${respostas[p.id] === op ? styles.opcaoSelecionada : ''}`}>
                            <input type="radio" name={p.id} value={op}
                              checked={respostas[p.id] === op}
                              onChange={() => atualizar(p.id, op)} />
                            {op}
                          </label>
                        ))}
                      </div>
                    )}

                    {p.tipo === 'sim_nao' && (
                      <div className={styles.opcoes}>
                        {['Sim', 'Não'].map(op => (
                          <label key={op} className={`${styles.opcao} ${respostas[p.id] === op ? styles.opcaoSelecionada : ''}`}>
                            <input type="radio" name={p.id} value={op}
                              checked={respostas[p.id] === op}
                              onChange={() => atualizar(p.id, op)} />
                            {op}
                          </label>
                        ))}
                      </div>
                    )}

                    {p.tipo === 'escala' && (
                      <div className={styles.escalaWrap}>
                        <div className={styles.escalaOpcoes}>
                          {[1,2,3,4,5,6,7,8,9,10].map(n => (
                            <button key={n}
                              className={`${styles.escalaBotao} ${respostas[p.id] === n ? styles.escalaSelecionado : ''}`}
                              onClick={() => atualizar(p.id, n)}
                            >{n}</button>
                          ))}
                        </div>
                        <div className={styles.escalaLabels}>
                          <span>Muito baixo</span>
                          <span>Muito alto</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {erro && <p className={styles.erro}>{erro}</p>}

              <div className={styles.navegacao}>
                <button className={styles.btnVoltar} onClick={() => setEtapa('identificacao')}>
                  ← Voltar
                </button>
                <button className={styles.btnEnviar} onClick={enviar} disabled={enviando}>
                  {enviando ? '⏳ Enviando...' : '✓ Enviar respostas'}
                </button>
              </div>
            </div>
          )}
        </div>

        <p className={styles.rodape}>Suas respostas são tratadas com sigilo.</p>
      </div>
    </div>
  )
}