import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import styles from './TrabalheConosco.module.css' // reutiliza o mesmo CSS

export default function ResponderFormulario() {
  const { token } = useParams()
  const [convite, setConvite]     = useState(null)
  const [formulario, setFormulario] = useState(null)
  const [perguntas, setPerguntas] = useState([])
  const [respostas, setRespostas] = useState({})
  const [loading, setLoading]     = useState(true)
  const [enviando, setEnviando]   = useState(false)
  const [enviado, setEnviado]     = useState(false)
  const [erro, setErro]           = useState('')

  useEffect(() => { carregar() }, [token])

  async function carregar() {
    setLoading(true)
    const { data: conv } = await supabase
      .from('formulario_convites').select('*, formulario:formularios(*)')
      .eq('token', token).single()

    if (!conv) { setErro('Link inválido ou expirado.'); setLoading(false); return }
    if (conv.status === 'respondido') { setEnviado(true); setLoading(false); return }
    if (conv.expira_em && new Date(conv.expira_em) < new Date()) {
      setErro('Este link expirou.'); setLoading(false); return
    }

    setConvite(conv)
    setFormulario(conv.formulario)

    const { data: p } = await supabase
      .from('formulario_perguntas').select('*')
      .eq('formulario_id', conv.formulario_id).order('ordem')
    setPerguntas(p ?? [])
    setLoading(false)
  }

  function atualizar(id, valor) {
    setRespostas(r => ({ ...r, [id]: valor }))
  }

  async function enviar() {
    const obrigatorias = perguntas.filter(p => p.obrigatoria)
    const faltando = obrigatorias.filter(p => !respostas[p.id]?.toString().trim())
    if (faltando.length > 0) { setErro('Por favor responda todas as perguntas obrigatórias.'); return }

    setEnviando(true); setErro('')
    try {
      await supabase.from('formulario_respostas').insert(
        perguntas.map(p => ({
          convite_id:    convite.id,
          formulario_id: convite.formulario_id,
          pergunta_id:   p.id,
          resposta_texto:   typeof respostas[p.id] === 'string' ? respostas[p.id] : null,
          resposta_numero:  typeof respostas[p.id] === 'number' ? respostas[p.id] : null,
          resposta_opcao:   p.tipo === 'multipla_escolha' || p.tipo === 'sim_nao' ? respostas[p.id] : null,
        }))
      )
      await supabase.from('formulario_convites').update({
        status: 'respondido', respondido_em: new Date().toISOString()
      }).eq('id', convite.id)
      setEnviado(true)
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

  if (erro) return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.sucessoCard}>
          <div style={{ fontSize: '28px' }}>⚠️</div>
          <h2 className={styles.sucessoTitulo}>{erro}</h2>
          <p className={styles.sucessoTexto}>Verifique o link ou entre em contato com a empresa.</p>
        </div>
      </div>
    </div>
  )

  if (enviado) return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.sucessoCard}>
          <div className={styles.sucessoIcon}>✓</div>
          <h2 className={styles.sucessoTitulo}>Respostas enviadas!</h2>
          <p className={styles.sucessoTexto}>Obrigado por responder. Suas respostas foram registradas com sucesso.</p>
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
            <button className={styles.btnEnviar} onClick={enviar} disabled={enviando}>
              {enviando ? '⏳ Enviando...' : '✓ Enviar respostas'}
            </button>
          </div>
        </div>

        <p className={styles.rodape}>Suas respostas são tratadas com sigilo.</p>
      </div>
    </div>
  )
}