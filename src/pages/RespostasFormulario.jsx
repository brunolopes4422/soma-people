import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { analisarRespostasFormulario } from '../lib/iaService'
import styles from './RespostasFormulario.module.css'

export default function RespostasFormulario() {
  const { id } = useParams() // formulario_id
  const navigate = useNavigate()
  const [formulario, setFormulario]   = useState(null)
  const [convites, setConvites]       = useState([])
  const [selecionado, setSelecionado] = useState(null)
  const [respostas, setRespostas]     = useState([])
  const [perguntas, setPerguntas]     = useState([])
  const [loading, setLoading]         = useState(true)
  const [analisando, setAnalisando]   = useState(false)
  const [analise, setAnalise]         = useState(null)

  useEffect(() => { carregar() }, [id])

  async function carregar() {
    setLoading(true)
    const { data: f } = await supabase
      .from('formularios').select('*').eq('id', id).single()
    setFormulario(f)

    const { data: p } = await supabase
      .from('formulario_perguntas').select('*')
      .eq('formulario_id', id).order('ordem')
    setPerguntas(p ?? [])

    const { data: c } = await supabase
      .from('formulario_convites')
      .select('*, colaborador:colaboradores(id, nome, cargo, departamento)')
      .eq('formulario_id', id)
      .order('created_at', { ascending: false })
    setConvites(c ?? [])
    setLoading(false)
  }

  async function selecionarConvite(convite) {
    setSelecionado(convite)
    setAnalise(null)
    const { data: r } = await supabase
      .from('formulario_respostas')
      .select('*, pergunta:formulario_perguntas(texto, ordem)')
      .eq('convite_id', convite.id)
      .order('pergunta(ordem)')
    setRespostas(r ?? [])
  }

  async function gerarAnaliseIA() {
    if (!selecionado || respostas.length === 0) return
    setAnalisando(true)
    try {
      const resultado = await analisarRespostasFormulario(
        formulario,
        perguntas,
        respostas,
        selecionado.colaborador
      )
      setAnalise(resultado)

      // Salva na ficha do colaborador se tiver
      if (selecionado.colaborador_id) {
        const analise_json = (await supabase
          .from('colaboradores')
          .select('analise_json')
          .eq('id', selecionado.colaborador_id)
          .single()
        )?.data?.analise_json || {}

        const chave = formulario.titulo.toLowerCase().includes('disc') ? 'disc' : 'eneagrama'
        await supabase.from('colaboradores').update({
          analise_json: {
            ...analise_json,
            [chave]: resultado,
          }
        }).eq('id', selecionado.colaborador_id)
      }
    } catch (e) {
      alert('Erro na análise: ' + e.message)
    }
    setAnalisando(false)
  }

  const respondidos = convites.filter(c => c.status === 'respondido').length
  const pendentes   = convites.filter(c => c.status === 'pendente').length

  return (
    <div className={styles.page}>
      <button className={styles.voltar} onClick={() => navigate('/formularios')}>← Voltar</button>

      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{formulario?.titulo}</h1>
          <p className={styles.subtitle}>
            {respondidos} respondidos · {pendentes} pendentes · {convites.length} total
          </p>
        </div>
      </div>

      <div className={styles.layout}>

        {/* Lista de convites */}
        <div className={styles.lista}>
          <p className={styles.listaHeader}>Respostas recebidas</p>
          {loading ? (
            <p className={styles.estado}>Carregando...</p>
          ) : convites.length === 0 ? (
            <p className={styles.estado}>Nenhum convite enviado ainda.</p>
          ) : convites.map(c => (
            <button
              key={c.id}
              className={`${styles.listaItem} ${selecionado?.id === c.id ? styles.listaAtivo : ''} ${c.status !== 'respondido' ? styles.listaPendente : ''}`}
              onClick={() => c.status === 'respondido' && selecionarConvite(c)}
              disabled={c.status !== 'respondido'}
            >
              <div className={styles.listaAvatar}>
                {iniciais(c.colaborador?.nome || c.nome_destinatario || '?')}
              </div>
              <div className={styles.listaInfo}>
                <span className={styles.listaNome}>
                  {c.colaborador?.nome || c.nome_destinatario || 'Externo'}
                </span>
                <span className={styles.listaDept}>{c.colaborador?.departamento}</span>
              </div>
              <span className={`${styles.badge} ${styles['badge_' + c.status]}`}>
                {c.status === 'respondido' ? '✓' : c.status === 'pendente' ? '⏳' : '✗'}
              </span>
            </button>
          ))}
        </div>

        {/* Painel de respostas */}
        {!selecionado ? (
          <div className={styles.vazio}>
            <p>Selecione um colaborador para ver as respostas</p>
          </div>
        ) : (
          <div className={styles.painel}>

            <div className={styles.painelHeader}>
              <div>
                <h2 className={styles.painelNome}>
                  {selecionado.colaborador?.nome || selecionado.nome_destinatario}
                </h2>
                <p className={styles.painelCargo}>
                  {selecionado.colaborador?.cargo} · {selecionado.colaborador?.departamento}
                </p>
                <p className={styles.painelData}>
                  Respondido em {formatarData(selecionado.respondido_em)}
                </p>
              </div>
              <button
                className={styles.btnIA}
                onClick={gerarAnaliseIA}
                disabled={analisando}
              >
                {analisando ? '⏳ Analisando...' : '🤖 Interpretar com IA'}
              </button>
            </div>

            {/* Análise IA */}
            {analise && (
              <div className={styles.analiseBox}>
                <p className={styles.secaoTitulo}>
                  {formulario?.titulo?.toLowerCase().includes('disc') ? '📊 Perfil DISC' : '🔮 Perfil Eneagrama'}
                </p>

                {analise.perfil_predominante && (
                  <div className={styles.perfilDestaque}>
                    <span className={styles.perfilLabel}>Perfil predominante</span>
                    <span className={styles.perfilValor}>{analise.perfil_predominante}</span>
                  </div>
                )}

                {analise.descricao && (
                  <p className={styles.analiseTexto}>{analise.descricao}</p>
                )}

                {analise.pontos_fortes?.length > 0 && (
                  <div className={styles.chips}>
                    <span className={styles.chipsLabel}>Pontos fortes:</span>
                    {analise.pontos_fortes.map((p, i) => (
                      <span key={i} className={styles.chipVerde}>{p}</span>
                    ))}
                  </div>
                )}

                {analise.pontos_atencao?.length > 0 && (
                  <div className={styles.chips}>
                    <span className={styles.chipsLabel}>Pontos de atenção:</span>
                    {analise.pontos_atencao.map((p, i) => (
                      <span key={i} className={styles.chipAmbar}>{p}</span>
                    ))}
                  </div>
                )}

                {analise.recomendacao_gestao && (
                  <div className={styles.recBox}>
                    <p className={styles.recLabel}>Recomendação para gestão</p>
                    <p className={styles.recTexto}>{analise.recomendacao_gestao}</p>
                  </div>
                )}

                {analise.compatibilidade_cargo && (
                  <div className={styles.recBox}>
                    <p className={styles.recLabel}>Compatibilidade com cargo atual</p>
                    <p className={styles.recTexto}>{analise.compatibilidade_cargo}</p>
                  </div>
                )}
              </div>
            )}

            {/* Respostas */}
            <div className={styles.respostasLista}>
              <p className={styles.secaoTitulo}>Respostas ({respostas.length})</p>
              {respostas.map((r, i) => (
                <div key={r.id} className={styles.respostaItem}>
                  <p className={styles.respostaPergunta}>
                    <span className={styles.respostaNum}>{i + 1}</span>
                    {r.pergunta?.texto}
                  </p>
                  <p className={styles.respostaResposta}>
                    {r.resposta_opcao || r.resposta_texto || r.resposta_numero || '—'}
                  </p>
                </div>
              ))}
            </div>

          </div>
        )}
      </div>
    </div>
  )
}

function iniciais(nome) {
  return (nome || '?').split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
}

function formatarData(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}