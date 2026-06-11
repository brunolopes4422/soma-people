import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { analisarCandidato } from '../../lib/iaService'
import styles from './TriagemCandidatos.module.css'

const SKILLS_CONFIG = [
  { id: 'comunicacao', label: 'Comunicação' },
  { id: 'organizacao', label: 'Organização' },
  { id: 'lideranca', label: 'Liderança' },
  { id: 'tecnico', label: 'Técnico' },
  { id: 'proatividade', label: 'Proatividade' },
]

export default function TriagemCandidatos() {
  const navigate = useNavigate()
  const [candidatos, setCandidatos] = useState([])
  const [selecionado, setSelecionado] = useState(null)
  const [loading, setLoading] = useState(true)
  const [analisando, setAnalisando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [carregandoPDF, setCarregandoPDF] = useState(false)
  const [pdfUrl, setPdfUrl] = useState(null)
  const [pdfBase64, setPdfBase64] = useState(null)
  const [form, setForm] = useState(null)

  useEffect(() => { carregar() }, [])

  async function carregar() {
    setLoading(true)
    const { data } = await supabase
      .from('candidatos')
      .select('*')
      .in('status', ['novo', 'analisado'])
      .order('created_at', { ascending: false })
    setCandidatos(data ?? [])
    setLoading(false)
  }

  async function selecionar(c) {
    setSelecionado(c)
    setPdfUrl(null)
    setPdfBase64(null)
    setForm({
      nome: c.nome,
      email: c.email,
      telefone: c.telefone || '',
      nivel: c.nivel || 'medio',
      area_indicada: c.analise_json?.area_indicada || '',
      perfil: c.analise_json?.perfil || '',
      habilidades: (c.analise_json?.habilidades || []).join(', '),
      pontos_fracos: (c.analise_json?.pontos_fracos || []).join(', '),
      skills: c.skills_json || {},
      score_geral: c.score_geral || 0,
      notas_admin: c.notas_admin || '',
    })

    if (c.curriculo_url) {
      setCarregandoPDF(true)
      try {
        const { data } = await supabase.storage
          .from('curriculos')
          .createSignedUrl(c.curriculo_url, 3600)
        if (data?.signedUrl) setPdfUrl(data.signedUrl)
      } catch { }
      setCarregandoPDF(false)
    }
  }

  function atualizarForm(campo, valor) {
    setForm(f => ({ ...f, [campo]: valor }))
  }

  function atualizarSkill(id, valor) {
    const novos = { ...form.skills, [id]: Number(valor) }
    const vals = Object.values(novos).filter(v => v > 0)
    const score = vals.length
      ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
      : 0
    setForm(f => ({ ...f, skills: novos, score_geral: score }))
  }

  async function extrairBase64(url) {
    try {
      const res = await fetch(url)
      const blob = await res.blob()
      return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result.split(',')[1])
        reader.readAsDataURL(blob)
      })
    } catch {
      return null
    }
  }

  async function analisarComIA() {
    if (!selecionado) return
    setAnalisando(true)
    try {
      let base64 = pdfBase64
      if (!base64 && pdfUrl) {
        base64 = await extrairBase64(pdfUrl)
        if (base64) setPdfBase64(base64)
      }

      const resultado = await analisarCandidato({
        curriculo: selecionado.curriculo_texto || '',
        pdfBase64: base64,
        respostas: selecionado.respostas_json,
      })

      setForm(f => ({
        ...f,
        nivel: resultado.nivel,
        area_indicada: resultado.area_indicada,
        perfil: resultado.perfil,
        habilidades: resultado.habilidades.join(', '),
        pontos_fracos: resultado.pontos_fracos.join(', '),
        skills: resultado.skills,
        score_geral: resultado.score_geral,
      }))
    } catch (e) {
      alert('Erro na análise: ' + e.message)
    }
    setAnalisando(false)
  }

  async function salvarEAprovar(status) {
    if (!selecionado || !form) return
    setSalvando(true)
    const analise_json = {
      ...(selecionado.analise_json || {}),
      area_indicada: form.area_indicada,
      perfil: form.perfil,
      habilidades: form.habilidades.split(',').map(h => h.trim()).filter(Boolean),
      pontos_fracos: form.pontos_fracos.split(',').map(p => p.trim()).filter(Boolean),
    }
    await supabase.from('candidates').update({
      nome: form.nome,
      email: form.email,
      telefone: form.telefone,
      nivel: form.nivel,
      skills_json: form.skills,
      score_geral: form.score_geral,
      analise_json,
      notas_admin: form.notas_admin,
      status,
    }).eq('id', selecionado.id)

    await carregar()
    setSelecionado(null)
    setForm(null)
    setPdfUrl(null)
    setPdfBase64(null)
    setSalvando(false)
  }

  const novos = candidatos.filter(c => c.status === 'novo').length
  const pendentes = candidatos.filter(c => c.status === 'analisado').length

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Triagem de candidatos</h1>
          <p className={styles.subtitle}>
            {novos} novos · {pendentes} aguardando revisão
          </p>
        </div>
        <button className={styles.btnVoltar} onClick={() => navigate('/talentos')}>
          ← Banco de talentos
        </button>
      </div>

      <div className={styles.layout}>

        <div className={styles.lista}>
          {loading ? (
            <p className={styles.estado}>Carregando...</p>
          ) : candidatos.length === 0 ? (
            <p className={styles.estado}>Nenhum candidato pendente.</p>
          ) : candidatos.map(c => (
            <button
              key={c.id}
              className={`${styles.listaItem} ${selecionado?.id === c.id ? styles.listaItemAtivo : ''}`}
              onClick={() => selecionar(c)}
            >
              <div className={styles.listaAvatar}>{iniciais(c.nome)}</div>
              <div className={styles.listaInfo}>
                <span className={styles.listaNome}>{c.nome}</span>
                <span className={styles.listaEmail}>{c.email}</span>
                <div className={styles.listaFlags}>
                  {c.curriculo_url && <span className={styles.flagPDF}>PDF</span>}
                  <span className={styles.listaData}>
                    {new Date(c.created_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>
              <span className={`${styles.listaBadge} ${c.status === 'novo' ? styles.badgeNovo : styles.badgeAnalisado}`}>
                {c.status === 'novo' ? 'Novo' : 'Revisar'}
              </span>
            </button>
          ))}
        </div>

        {!form ? (
          <div className={styles.vazio}>
            <p>Selecione um candidato para revisar</p>
          </div>
        ) : (
          <div className={styles.painel}>

            <div className={styles.painelHeader}>
              <h2 className={styles.painelNome}>{form.nome}</h2>
              <div className={styles.painelAcoes}>
                {carregandoPDF && (
                  <span className={styles.loadingPDF}>Carregando PDF...</span>
                )}
                {pdfUrl && !carregandoPDF && (
                  <button
                    className={styles.btnPDF}
                    onClick={() => window.open(pdfUrl, '_blank')}
                  >
                    📄 Ver currículo
                  </button>
                )}
                {pdfUrl && !carregandoPDF && (
                  <a
                    href={pdfUrl}
                    download={selecionado?.curriculo_url?.split('/').pop() || 'curriculo.pdf'}
                    className={styles.btnDownload}
                  >
                    ↓ Baixar
                  </a>
                )}
                {!selecionado?.curriculo_url && !carregandoPDF && (
                  <span className={styles.semPDF}>Sem currículo anexado</span>
                )}
                <button
                  className={styles.btnIA}
                  onClick={analisarComIA}
                  disabled={analisando}
                >
                  {analisando ? '⏳ Analisando...' : '🤖 Analisar com IA'}
                </button>
              </div>
            </div>

            {pdfUrl && (
              <div className={styles.avisoPDF}>
                📎 PDF disponível — ao clicar em "Analisar com IA" o sistema vai ler o currículo e cruzar com as respostas.
              </div>
            )}

            <div className={styles.secao}>
              <p className={styles.secaoTitulo}>Dados básicos</p>
              <div className={styles.grid2}>
                <div className={styles.campo}>
                  <label>Nome</label>
                  <input value={form.nome} onChange={e => atualizarForm('nome', e.target.value)} />
                </div>
                <div className={styles.campo}>
                  <label>Email</label>
                  <input value={form.email} onChange={e => atualizarForm('email', e.target.value)} />
                </div>
                <div className={styles.campo}>
                  <label>Telefone</label>
                  <input value={form.telefone} onChange={e => atualizarForm('telefone', e.target.value)} />
                </div>
                <div className={styles.campo}>
                  <label>Nível</label>
                  <select value={form.nivel} onChange={e => atualizarForm('nivel', e.target.value)}>
                    <option value="iniciante">Iniciante</option>
                    <option value="medio">Médio</option>
                    <option value="avancado">Avançado</option>
                  </select>
                </div>
                <div className={styles.campo} style={{ gridColumn: '1/-1' }}>
                  <label>Área indicada</label>
                  <input value={form.area_indicada} onChange={e => atualizarForm('area_indicada', e.target.value)} />
                </div>
              </div>
            </div>

            <div className={styles.secao}>
              <p className={styles.secaoTitulo}>Análise do perfil</p>
              <div className={styles.campo}>
                <label>Perfil comportamental</label>
                <textarea rows={3} value={form.perfil} onChange={e => atualizarForm('perfil', e.target.value)} />
              </div>
              <div className={styles.grid2}>
                <div className={styles.campo}>
                  <label>Habilidades (separadas por vírgula)</label>
                  <textarea rows={2} value={form.habilidades} onChange={e => atualizarForm('habilidades', e.target.value)} />
                </div>
                <div className={styles.campo}>
                  <label>Pontos fracos (separadas por vírgula)</label>
                  <textarea rows={2} value={form.pontos_fracos} onChange={e => atualizarForm('pontos_fracos', e.target.value)} />
                </div>
              </div>
            </div>

            <div className={styles.secao}>
              <p className={styles.secaoTitulo}>
                Skills — Score geral: <strong>{form.score_geral}</strong>
              </p>
              {SKILLS_CONFIG.map(s => {
                const val = form.skills[s.id] ?? 0
                return (
                  <div key={s.id} className={styles.skillRow}>
                    <span className={styles.skillLabel}>{s.label}</span>
                    <input
                      type="range" min={0} max={100} step={5}
                      value={val}
                      onChange={e => atualizarSkill(s.id, e.target.value)}
                      className={styles.slider}
                    />
                    <span className={styles.skillVal}>{val}</span>
                  </div>
                )
              })}
            </div>

            {selecionado?.respostas_json && (
              <div className={styles.secao}>
                <p className={styles.secaoTitulo}>Respostas do candidato</p>
                {[
                  ['objetivo', 'Objetivo profissional'],
                  ['pontos_fortes', 'Em que é bom'],
                  ['dificuldades', 'Dificuldades'],
                  ['ambiente', 'Ambiente preferido'],
                  ['diferencial', 'Diferencial'],
                ].map(([key, label]) => selecionado.respostas_json[key] ? (
                  <div key={key} className={styles.resposta}>
                    <span className={styles.respostaLabel}>{label}</span>
                    <p className={styles.respostaTexto}>{selecionado.respostas_json[key]}</p>
                  </div>
                ) : null)}
              </div>
            )}

            <div className={styles.secao}>
              <p className={styles.secaoTitulo}>Notas internas</p>
              <div className={styles.campo}>
                <label>Observações da liderança (não visível ao candidato)</label>
                <textarea
                  rows={3}
                  value={form.notas_admin}
                  onChange={e => atualizarForm('notas_admin', e.target.value)}
                  placeholder="Impressões, pontos de atenção, contexto da vaga..."
                />
              </div>
            </div>

            <div className={styles.acoes}>
              <button
                className={styles.btnAprovar}
                onClick={() => salvarEAprovar('aprovado')}
                disabled={salvando}
              >
                ✓ Aprovar e enviar ao banco
              </button>
              <button
                className={styles.btnSalvar}
                onClick={() => salvarEAprovar('analisado')}
                disabled={salvando}
              >
                Salvar revisão
              </button>
              <button
                className={styles.btnRejeitar}
                onClick={() => salvarEAprovar('rejeitado')}
                disabled={salvando}
              >
                ✕ Rejeitar
              </button>
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