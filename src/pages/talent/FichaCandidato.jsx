import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { analisarCandidato } from '../../lib/iaService'
import styles from './FichaCandidato.module.css'

const FUNIL = [
  { id: 'novo',        label: 'Novo',        cor: 'purple' },
  { id: 'triagem',     label: 'Triagem',     cor: 'blue'   },
  { id: 'entrevista',  label: 'Entrevista',  cor: 'amber'  },
  { id: 'aprovado',    label: 'Aprovado',    cor: 'green'  },
  { id: 'contratado',  label: 'Contratado',  cor: 'teal'   },
  { id: 'reprovado',   label: 'Reprovado',   cor: 'red'    },
]

const SKILLS = [
  { id: 'comunicacao',  label: 'Comunicação'  },
  { id: 'organizacao',  label: 'Organização'  },
  { id: 'lideranca',    label: 'Liderança'    },
  { id: 'tecnico',      label: 'Técnico'      },
  { id: 'proatividade', label: 'Proatividade' },
]

export default function FichaCandidato() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { perfil: userPerfil } = useAuth()

  const [candidato, setCandidato]   = useState(null)
  const [aba, setAba]               = useState('perfil')
  const [loading, setLoading]       = useState(true)
  const [salvando, setSalvando]     = useState(false)
  const [analisando, setAnalisando] = useState(false)
  const [contatos, setContatos]     = useState([])
  const [novoContato, setNovoContato] = useState('')
  const [pdfUrl, setPdfUrl]         = useState(null)
  const [form, setForm]             = useState(null)
  const [convertendo, setConvertendo] = useState(false)
  const [modalConverter, setModalConverter] = useState(false)
  const [dataInicio, setDataInicio] = useState('')

  useEffect(() => { carregar() }, [id])

  async function carregar() {
    setLoading(true)
    const { data: c } = await supabase
      .from('candidatos').select('*').eq('id', id).single()
    setCandidato(c)
    setForm({
      nome:          c.nome,
      email:         c.email,
      telefone:      c.telefone || '',
      linkedin:      c.linkedin || '',
      nivel:         c.nivel || 'medio',
      area_indicada: c.analise_json?.area_indicada || '',
      perfil:        c.analise_json?.perfil || '',
      habilidades:   (c.analise_json?.habilidades || []).join(', '),
      pontos_fracos: (c.analise_json?.pontos_fracos || []).join(', '),
      skills:        c.skills_json || {},
      score_geral:   c.score_geral || 0,
      notas_admin:   c.notas_admin || '',
      status:        c.status || 'novo',
    })

    // Carrega contatos do campo notas (JSON simples)
    try {
      const parsed = JSON.parse(c.notas_admin || '[]')
      if (Array.isArray(parsed)) setContatos(parsed)
    } catch { setContatos([]) }

    // PDF
    if (c.curriculo_url) {
      try {
        const { data } = await supabase.storage
          .from('curriculos').createSignedUrl(c.curriculo_url, 3600)
        if (data?.signedUrl) setPdfUrl(data.signedUrl)
      } catch {}
    }
    setLoading(false)
  }

  function atualizar(campo, valor) {
    setForm(f => ({ ...f, [campo]: valor }))
  }

  function atualizarSkill(skillId, valor) {
    const novos = { ...form.skills, [skillId]: Number(valor) }
    const vals  = Object.values(novos).filter(v => v > 0)
    const score = vals.length ? Math.round(vals.reduce((a,b)=>a+b,0)/vals.length) : 0
    setForm(f => ({ ...f, skills: novos, score_geral: score }))
  }

  async function salvar() {
    setSalvando(true)
    const analise_json = {
      ...(candidato.analise_json || {}),
      area_indicada: form.area_indicada,
      perfil:        form.perfil,
      habilidades:   form.habilidades.split(',').map(h=>h.trim()).filter(Boolean),
      pontos_fracos: form.pontos_fracos.split(',').map(p=>p.trim()).filter(Boolean),
    }
    await supabase.from('candidatos').update({
      nome:         form.nome,
      email:        form.email,
      telefone:     form.telefone,
      linkedin:     form.linkedin,
      nivel:        form.nivel,
      skills_json:  form.skills,
      score_geral:  form.score_geral,
      analise_json,
      status:       form.status,
    }).eq('id', id)
    await carregar()
    setSalvando(false)
  }

  async function mudarStatus(novoStatus) {
    await supabase.from('candidatos').update({ status: novoStatus }).eq('id', id)
    setForm(f => ({ ...f, status: novoStatus }))
    await carregar()
  }

  async function adicionarContato() {
    if (!novoContato.trim()) return
    const novos = [...contatos, {
      texto: novoContato,
      autor: userPerfil?.nome,
      data:  new Date().toISOString(),
    }]
    await supabase.from('candidatos').update({
      notas_admin: JSON.stringify(novos)
    }).eq('id', id)
    setContatos(novos)
    setNovoContato('')
  }

  async function analisarComIA() {
    setAnalisando(true)
    try {
      const resultado = await analisarCandidato({
        curriculo:  candidato.curriculo_texto || '',
        pdfBase64:  null,
        respostas:  candidato.respostas_json,
      })
      setForm(f => ({
        ...f,
        nivel:         resultado.nivel,
        area_indicada: resultado.area_indicada,
        perfil:        resultado.perfil,
        habilidades:   resultado.habilidades.join(', '),
        pontos_fracos: resultado.pontos_fracos.join(', '),
        skills:        resultado.skills,
        score_geral:   resultado.score_geral,
      }))
    } catch (e) { alert('Erro: ' + e.message) }
    setAnalisando(false)
  }

  async function converter() {
    if (!dataInicio) { alert('Informe a data de início.'); return }
    setConvertendo(true)
    const { data: colab } = await supabase.from('colaboradores').insert({
      nome:         candidato.nome,
      email:        candidato.email,
      whatsapp:     candidato.telefone,
      cargo:        form.area_indicada,
      data_admissao: dataInicio,
      skills_json:  candidato.skills_json,
      score_geral:  candidato.score_geral,
      analise_json: candidato.analise_json,
      status:       'ativo',
    }).select().single()

    if (colab) {
      await supabase.from('candidatos').update({
        status: 'contratado',
        colaborador_id: colab.id,
      }).eq('id', id)
      navigate(`/colaboradores/${colab.id}`)
    }
    setConvertendo(false)
  }

  if (loading) return <p className={styles.estado}>Carregando...</p>
  if (!candidato) return <p className={styles.estado}>Candidato não encontrado.</p>

  const etapaAtual = FUNIL.find(f => f.id === (form?.status || candidato.status))

  return (
    <div className={styles.page}>
      <button className={styles.voltar} onClick={() => navigate('/talentos')}>
        ← Banco de talentos
      </button>

      {/* Cabeçalho */}
      <div className={styles.cabecalho}>
        <div className={styles.avatar}>{iniciais(candidato.nome)}</div>
        <div className={styles.cabecalhoInfo}>
          <h1 className={styles.nome}>{candidato.nome}</h1>
          <p className={styles.meta}>
            {candidato.email}
            {candidato.telefone && ` · ${candidato.telefone}`}
          </p>
          <div className={styles.tags}>
            {candidato.nivel && (
              <span className={styles.tag}>{candidato.nivel}</span>
            )}
            {candidato.score_geral > 0 && (
              <span className={`${styles.tag} ${styles['score_' + cor(candidato.score_geral)]}`}>
                Score {candidato.score_geral}
              </span>
            )}
          </div>
        </div>

        {/* Ações rápidas */}
        <div className={styles.acoesCabecalho}>
          {pdfUrl && (
            <button className={styles.btnPDF} onClick={() => window.open(pdfUrl, '_blank')}>
              📄 Ver currículo
            </button>
          )}
          {form?.status === 'aprovado' && (
            <button className={styles.btnContratar} onClick={() => setModalConverter(true)}>
              ✓ Contratar
            </button>
          )}
        </div>
      </div>

      {/* Funil de status */}
      <div className={styles.funil}>
        {FUNIL.filter(f => f.id !== 'contratado').map((etapa, i) => (
          <button
            key={etapa.id}
            className={`${styles.etapa} ${form?.status === etapa.id ? styles['etapaAtiva_' + etapa.cor] : ''}`}
            onClick={() => mudarStatus(etapa.id)}
          >
            {etapa.label}
          </button>
        ))}
      </div>

      {/* Abas */}
      <div className={styles.abas}>
        {[
          { id: 'perfil',    label: 'Perfil & skills'    },
          { id: 'respostas', label: 'Respostas'           },
          { id: 'contatos',  label: `Contatos (${contatos.length})` },
        ].map(a => (
          <button key={a.id}
            className={`${styles.aba} ${aba === a.id ? styles.abaAtiva : ''}`}
            onClick={() => setAba(a.id)}
          >{a.label}</button>
        ))}
      </div>

      <div className={styles.conteudo}>

        {/* Aba perfil */}
        {aba === 'perfil' && (
          <div className={styles.secao}>
            <div className={styles.grid2}>
              <Campo label="Nome" valor={form.nome} onChange={v => atualizar('nome', v)} editavel />
              <Campo label="Email" valor={form.email} onChange={v => atualizar('email', v)} editavel />
              <Campo label="Telefone" valor={form.telefone} onChange={v => atualizar('telefone', v)} editavel />
              <Campo label="LinkedIn" valor={form.linkedin} onChange={v => atualizar('linkedin', v)} editavel />
              <CampoSelect label="Nível" valor={form.nivel} onChange={v => atualizar('nivel', v)}
                opcoes={[['iniciante','Iniciante'],['medio','Médio'],['avancado','Avançado']]} />
              <Campo label="Área indicada" valor={form.area_indicada} onChange={v => atualizar('area_indicada', v)} editavel />
            </div>

            <div className={styles.campo}>
              <label>Perfil comportamental</label>
              <textarea rows={3} value={form.perfil} onChange={e => atualizar('perfil', e.target.value)} />
            </div>

            <div className={styles.grid2}>
              <div className={styles.campo}>
                <label>Habilidades (vírgula)</label>
                <textarea rows={2} value={form.habilidades} onChange={e => atualizar('habilidades', e.target.value)} />
              </div>
              <div className={styles.campo}>
                <label>Pontos fracos (vírgula)</label>
                <textarea rows={2} value={form.pontos_fracos} onChange={e => atualizar('pontos_fracos', e.target.value)} />
              </div>
            </div>

            <p className={styles.secaoTitulo}>Skills — Score: <strong>{form.score_geral}</strong></p>
            {SKILLS.map(s => {
              const val = form.skills[s.id] ?? 0
              return (
                <div key={s.id} className={styles.skillRow}>
                  <span className={styles.skillLabel}>{s.label}</span>
                  <input type="range" min={0} max={100} step={5}
                    value={val}
                    onChange={e => atualizarSkill(s.id, e.target.value)}
                    className={styles.slider} />
                  <span className={styles.skillVal}>{val}</span>
                </div>
              )
            })}

            <div className={styles.acoes}>
              <button className={styles.btnSalvar} onClick={salvar} disabled={salvando}>
                {salvando ? 'Salvando...' : 'Salvar alterações'}
              </button>
              <button className={styles.btnIA} onClick={analisarComIA} disabled={analisando}>
                {analisando ? '⏳ Analisando...' : '🤖 Reanalisar com IA'}
              </button>
            </div>
          </div>
        )}

        {/* Aba respostas */}
        {aba === 'respostas' && (
          <div className={styles.secao}>
            {!candidato.respostas_json || Object.keys(candidato.respostas_json).length === 0 ? (
              <p className={styles.vazio}>Nenhuma resposta registrada.</p>
            ) : (
              [
                ['objetivo',      'Objetivo profissional'],
                ['pontos_fortes', 'Em que é bom'],
                ['dificuldades',  'Dificuldades'],
                ['ambiente',      'Ambiente preferido'],
                ['diferencial',   'Diferencial'],
                ['area',          'Área de interesse'],
              ].map(([key, label]) => candidato.respostas_json[key] ? (
                <div key={key} className={styles.respostaItem}>
                  <span className={styles.respostaLabel}>{label}</span>
                  <p className={styles.respostaTexto}>{candidato.respostas_json[key]}</p>
                </div>
              ) : null)
            )}
          </div>
        )}

        {/* Aba contatos */}
        {aba === 'contatos' && (
          <div className={styles.secao}>
            <p className={styles.secaoTitulo}>Histórico de contato</p>

            {contatos.length === 0 ? (
              <p className={styles.vazio}>Nenhum contato registrado ainda.</p>
            ) : (
              <div className={styles.contatosList}>
                {[...contatos].reverse().map((c, i) => (
                  <div key={i} className={styles.contatoItem}>
                    <div className={styles.contatoHeader}>
                      <span className={styles.contatoAutor}>{c.autor}</span>
                      <span className={styles.contatoData}>{formatarData(c.data)}</span>
                    </div>
                    <p className={styles.contatoTexto}>{c.texto}</p>
                  </div>
                ))}
              </div>
            )}

            <div className={styles.novoContato}>
              <textarea
                className={styles.contatoInput}
                rows={3}
                value={novoContato}
                onChange={e => setNovoContato(e.target.value)}
                placeholder="Ex: Entrei em contato pelo WhatsApp, candidata demonstrou interesse..."
              />
              <button className={styles.btnSalvar} onClick={adicionarContato} disabled={!novoContato.trim()}>
                + Registrar contato
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal converter em colaborador */}
      {modalConverter && (
        <div className={styles.overlay} onClick={e => e.target === e.currentTarget && setModalConverter(false)}>
          <div className={styles.modal}>
            <h3 className={styles.modalTitulo}>✓ Contratar {candidato.nome}</h3>
            <p className={styles.modalDesc}>
              Isso vai criar uma ficha de colaborador completa com os dados do candidato.
            </p>
            <div className={styles.campo}>
              <label>Data de início *</label>
              <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
            </div>
            <div className={styles.modalAcoes}>
              <button className={styles.btnContratar} onClick={converter} disabled={convertendo}>
                {convertendo ? 'Criando ficha...' : '✓ Confirmar contratação'}
              </button>
              <button className={styles.btnCancelar} onClick={() => setModalConverter(false)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Campo({ label, valor, onChange, editavel }) {
  return (
    <div className={styles.campo}>
      <label>{label}</label>
      {editavel
        ? <input value={valor || ''} onChange={e => onChange(e.target.value)} />
        : <span className={styles.campoValor}>{valor || '—'}</span>
      }
    </div>
  )
}

function CampoSelect({ label, valor, onChange, opcoes }) {
  return (
    <div className={styles.campo}>
      <label>{label}</label>
      <select value={valor} onChange={e => onChange(e.target.value)}>
        {opcoes.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  )
}

function iniciais(nome) { return (nome||'?').split(' ').slice(0,2).map(n=>n[0]).join('').toUpperCase() }
function cor(val) { return val >= 75 ? 'alto' : val >= 50 ? 'medio' : 'baixo' }
function formatarData(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })
}