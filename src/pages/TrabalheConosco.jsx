import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { analisarCandidato } from '../lib/iaService'
import styles from './TrabalheConosco.module.css'

const ETAPAS = ['Dados pessoais', 'Mini entrevista', 'Currículo']

const PERGUNTAS = [
  { id: 'objetivo',      label: 'Qual é o seu objetivo profissional?',             placeholder: 'Onde você quer chegar na carreira...' },
  { id: 'pontos_fortes', label: 'Em que você é muito bom?',                        placeholder: 'Suas principais habilidades e pontos fortes...' },
  { id: 'dificuldades',  label: 'Onde você tem dificuldade?',                      placeholder: 'Seja honesto, todos temos pontos a desenvolver...' },
  { id: 'ambiente',      label: 'Que tipo de ambiente você prefere trabalhar?',    placeholder: 'Dinâmico, estruturado, remoto, presencial...' },
  { id: 'diferencial',   label: 'Por que devemos te contratar?',                   placeholder: 'O que te torna único para essa oportunidade...' },
  { id: 'area',          label: 'Qual área te interessa?',                         placeholder: 'Fiscal, Contábil, DP, Comercial, Administrativo...' },
]

export default function TrabalheConosco() {
  const [etapa, setEtapa]         = useState(0)
  const [dados, setDados]         = useState({ nome:'', email:'', telefone:'', whatsapp:'', linkedin:'' })
  const [respostas, setRespostas] = useState({})
  const [arquivo, setArquivo]     = useState(null)
  const [enviando, setEnviando]   = useState(false)
  const [enviado, setEnviado]     = useState(false)
  const [erro, setErro]           = useState('')

  function atualizarDado(campo, valor) {
    setDados(d => ({ ...d, [campo]: valor }))
  }

  function atualizarResposta(id, valor) {
    setRespostas(r => ({ ...r, [id]: valor }))
  }

  function avancar() {
    setErro('')
    if (etapa === 0) {
      if (!dados.nome.trim() || !dados.email.trim() || !dados.telefone.trim()) {
        setErro('Nome, email e telefone são obrigatórios.')
        return
      }
    }
    if (etapa === 1) {
      const obrigatorias = ['objetivo', 'pontos_fortes', 'diferencial']
      const faltando = obrigatorias.filter(k => !respostas[k]?.trim())
      if (faltando.length > 0) {
        setErro('Por favor responda pelo menos as 3 primeiras perguntas.')
        return
      }
    }
    setEtapa(e => e + 1)
  }

  async function enviar() {
    setEnviando(true)
    setErro('')
    try {
      let curriculo_url = null

      // Upload do PDF se enviado
      if (arquivo) {
        const nomeArquivo = `${Date.now()}_${arquivo.name.replace(/\s/g, '_')}`
        const { error: uploadError } = await supabase.storage
          .from('curriculos')
          .upload(nomeArquivo, arquivo)
        if (uploadError) throw uploadError
        curriculo_url = nomeArquivo
      }

      // Análise da IA
      let analise = {}
      let skills  = {}
      let score   = 0
      try {
        let pdfBase64 = null
        if (arquivo) {
          pdfBase64 = await new Promise(resolve => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result.split(',')[1])
            reader.readAsDataURL(arquivo)
          })
        }
        const resultado = await analisarCandidato({
          curriculo:  '',
          pdfBase64,
          respostas,
        })
        analise = resultado
        skills  = resultado.skills || {}
        score   = resultado.score_geral || 0
      } catch {
        // IA falhou — salva mesmo assim sem análise
      }

      // Insere no banco
      await supabase.from('candidatos').insert({
        nome:           dados.nome,
        email:          dados.email,
        telefone:       dados.telefone,
        linkedin:       dados.linkedin || null,
        curriculo_url,
        respostas_json: respostas,
        analise_json:   analise,
        skills_json:    skills,
        score_geral:    score,
        nivel:          analise.nivel || null,
        area_indicada:  analise.area_indicada || respostas.area || null,
        status:         score > 0 ? 'analisado' : 'novo',
      })

      setEnviado(true)
    } catch (e) {
      setErro('Erro ao enviar: ' + e.message)
    }
    setEnviando(false)
  }

  if (enviado) return <Sucesso nome={dados.nome} />

  return (
    <div className={styles.page}>
      <div className={styles.container}>

        {/* Header */}
        <div className={styles.header}>
          <div className={styles.logo}>
            <span className={styles.logoIcon}>◆</span>
            <span className={styles.logoText}>Soma</span>
          </div>
          <h1 className={styles.titulo}>Trabalhe conosco</h1>
          <p className={styles.subtitulo}>
            Faça parte do nosso time. Preencha as informações abaixo e entraremos em contato.
          </p>
        </div>

        {/* Progresso */}
        <div className={styles.progresso}>
          {ETAPAS.map((label, i) => (
            <div key={i} className={`${styles.etapaStep} ${i <= etapa ? styles.etapaAtiva : ''}`}>
              <div className={styles.etapaBolinha}>{i < etapa ? '✓' : i + 1}</div>
              <span className={styles.etapaLabel}>{label}</span>
              {i < ETAPAS.length - 1 && <div className={`${styles.etapaLinha} ${i < etapa ? styles.etapaLinhaAtiva : ''}`} />}
            </div>
          ))}
        </div>

        {/* Conteúdo */}
        <div className={styles.card}>

          {/* Etapa 1 — Dados pessoais */}
          {etapa === 0 && (
            <div className={styles.etapaConteudo}>
              <h2 className={styles.etapaTitulo}>Seus dados</h2>
              <p className={styles.etapaDesc}>Precisamos de algumas informações básicas para entrar em contato.</p>
              <div className={styles.campos}>
                <Campo label="Nome completo *" valor={dados.nome} onChange={v => atualizarDado('nome', v)} placeholder="Seu nome completo" />
                <Campo label="Email *" type="email" valor={dados.email} onChange={v => atualizarDado('email', v)} placeholder="seu@email.com" />
                <div className={styles.grid2}>
                  <Campo label="Telefone *" valor={dados.telefone} onChange={v => atualizarDado('telefone', v)} placeholder="(11) 99999-9999" />
                  <Campo label="WhatsApp" valor={dados.whatsapp} onChange={v => atualizarDado('whatsapp', v)} placeholder="(11) 99999-9999" />
                </div>
                <Campo label="LinkedIn" valor={dados.linkedin} onChange={v => atualizarDado('linkedin', v)} placeholder="linkedin.com/in/seuperfil" />
              </div>
            </div>
          )}

          {/* Etapa 2 — Mini entrevista */}
          {etapa === 1 && (
            <div className={styles.etapaConteudo}>
              <h2 className={styles.etapaTitulo}>Nos conte sobre você</h2>
              <p className={styles.etapaDesc}>Responda com sinceridade — isso nos ajuda a entender seu perfil.</p>
              <div className={styles.campos}>
                {PERGUNTAS.map((p, i) => (
                  <div key={p.id} className={styles.pergunta}>
                    <label className={styles.perguntaLabel}>
                      <span className={styles.perguntaNum}>{i + 1}</span>
                      {p.label}
                      {['objetivo','pontos_fortes','diferencial'].includes(p.id) && (
                        <span className={styles.obrigatorio}> *</span>
                      )}
                    </label>
                    <textarea
                      className={styles.perguntaInput}
                      rows={3}
                      value={respostas[p.id] || ''}
                      onChange={e => atualizarResposta(p.id, e.target.value)}
                      placeholder={p.placeholder}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Etapa 3 — Currículo */}
          {etapa === 2 && (
            <div className={styles.etapaConteudo}>
              <h2 className={styles.etapaTitulo}>Seu currículo</h2>
              <p className={styles.etapaDesc}>
                Envie seu currículo em PDF. Isso não é obrigatório, mas aumenta muito suas chances!
              </p>
              <div className={styles.uploadArea}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f?.type === 'application/pdf') setArquivo(f) }}
              >
                {arquivo ? (
                  <div className={styles.arquivoSelecionado}>
                    <span className={styles.arquivoIcon}>📄</span>
                    <span className={styles.arquivoNome}>{arquivo.name}</span>
                    <button className={styles.arquivoRemover} onClick={() => setArquivo(null)}>✕</button>
                  </div>
                ) : (
                  <>
                    <span className={styles.uploadIcon}>📎</span>
                    <p className={styles.uploadTexto}>Arraste seu PDF aqui ou clique para selecionar</p>
                    <p className={styles.uploadDica}>Apenas arquivos PDF</p>
                    <label className={styles.btnUpload}>
                      Selecionar arquivo
                      <input type="file" accept=".pdf" hidden onChange={e => setArquivo(e.target.files[0])} />
                    </label>
                  </>
                )}
              </div>

              <div className={styles.resumo}>
                <p className={styles.resumoTitulo}>Resumo do que você preencheu</p>
                <div className={styles.resumoItens}>
                  <div className={styles.resumoItem}>
                    <span className={styles.resumoLabel}>Nome</span>
                    <span className={styles.resumoValor}>{dados.nome}</span>
                  </div>
                  <div className={styles.resumoItem}>
                    <span className={styles.resumoLabel}>Email</span>
                    <span className={styles.resumoValor}>{dados.email}</span>
                  </div>
                  <div className={styles.resumoItem}>
                    <span className={styles.resumoLabel}>Telefone</span>
                    <span className={styles.resumoValor}>{dados.telefone}</span>
                  </div>
                  <div className={styles.resumoItem}>
                    <span className={styles.resumoLabel}>Respostas</span>
                    <span className={styles.resumoValor}>{Object.keys(respostas).length} de {PERGUNTAS.length}</span>
                  </div>
                  <div className={styles.resumoItem}>
                    <span className={styles.resumoLabel}>Currículo</span>
                    <span className={styles.resumoValor}>{arquivo ? arquivo.name : 'Não enviado'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Erro */}
          {erro && <p className={styles.erro}>{erro}</p>}

          {/* Navegação */}
          <div className={styles.navegacao}>
            {etapa > 0 && (
              <button className={styles.btnVoltar} onClick={() => setEtapa(e => e - 1)}>
                ← Voltar
              </button>
            )}
            {etapa < 2 ? (
              <button className={styles.btnAvancar} onClick={avancar}>
                Continuar →
              </button>
            ) : (
              <button className={styles.btnEnviar} onClick={enviar} disabled={enviando}>
                {enviando ? '⏳ Enviando e analisando...' : '✓ Enviar candidatura'}
              </button>
            )}
          </div>
        </div>

        <p className={styles.rodape}>
          Seus dados são tratados com sigilo e segurança. Entramos em contato apenas se houver compatibilidade.
        </p>
      </div>
    </div>
  )
}

function Sucesso({ nome }) {
  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.sucessoCard}>
          <div className={styles.sucessoIcon}>✓</div>
          <h2 className={styles.sucessoTitulo}>Candidatura enviada!</h2>
          <p className={styles.sucessoTexto}>
            Obrigado, <strong>{nome}</strong>! Recebemos sua candidatura e nossa equipe vai analisá-la em breve.
            Se houver compatibilidade, entraremos em contato pelo email ou telefone informado.
          </p>
          <p className={styles.sucessoDica}>Fique de olho no seu email 👀</p>
        </div>
      </div>
    </div>
  )
}

function Campo({ label, valor, onChange, type = 'text', placeholder }) {
  return (
    <div className={styles.campo}>
      <label className={styles.campoLabel}>{label}</label>
      <input
        type={type}
        value={valor}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={styles.campoInput}
      />
    </div>
  )
}