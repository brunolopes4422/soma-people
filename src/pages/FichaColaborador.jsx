import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { podeVer } from '../lib/permissoes'
import { analisarPerfilColaborador } from '../lib/iaService'
import styles from './FichaColaborador.module.css'

const ABAS = [
  { id: 'pessoal', label: 'Pessoal' },
  { id: 'perfil', label: 'Perfil & interesses' },
  { id: 'formacao', label: 'Formação' },
  { id: 'skills', label: 'Skills & IA' },
  { id: 'financeiro', label: 'Financeiro', restrito: true },
  { id: 'pdi', label: 'Avaliações & PDI' },
  { id: 'comportamental', label: 'Perfil comportamental' },
]

const SKILLS_CONFIG = [
  { id: 'comunicacao', label: 'Comunicação', grupo: 'Interpessoal' },
  { id: 'relacionamento_cliente', label: 'Relacionamento c/ cliente', grupo: 'Interpessoal' },
  { id: 'trabalho_equipe', label: 'Trabalho em equipe', grupo: 'Interpessoal' },
  { id: 'lideranca', label: 'Liderança', grupo: 'Interpessoal' },
  { id: 'organizacao', label: 'Organização', grupo: 'Executivo' },
  { id: 'execucao', label: 'Execução / Entrega', grupo: 'Executivo' },
  { id: 'proatividade', label: 'Proatividade', grupo: 'Executivo' },
  { id: 'resiliencia', label: 'Resiliência / Pressão', grupo: 'Executivo' },
  { id: 'facilidade_aprendizado', label: 'Facilidade de aprendizado', grupo: 'Crescimento' },
  { id: 'autodidata', label: 'Autodidata', grupo: 'Crescimento' },
  { id: 'vendas', label: 'Vendas / Persuasão', grupo: 'Crescimento' },
  { id: 'visao_estrategica', label: 'Visão estratégica', grupo: 'Crescimento' },
]

const PERFIS_ATUACAO = [
  { id: 'perfil_campo', label: 'Campo', icon: '🏃' },
  { id: 'perfil_atendimento', label: 'Atendimento', icon: '🎧' },
  { id: 'perfil_execucao', label: 'Execução', icon: '⚙️' },
  { id: 'perfil_lideranca', label: 'Liderança', icon: '👑' },
  { id: 'perfil_prova_fogo', label: 'Prova de fogo', icon: '🔥' },
]

export default function FichaColaborador() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { perfil: userPerfil } = useAuth()

  const [colab, setColab] = useState(null)
  const [aba, setAba] = useState('pessoal')
  const [loading, setLoading] = useState(true)
  const [avaliacoes, setAvaliacoes] = useState([])
  const [skills, setSkills] = useState({})
  const [analisando, setAnalisando] = useState(false)
  const [salvandoSkills, setSalvandoSkills] = useState(false)
  const [modalTipo, setModalTipo] = useState(null)

  const isSuperAdmin = userPerfil?.perfil === 'super_admin'
  const verFinanceiro = podeVer(userPerfil?.perfil, 'verFinanceiro')
  const verAvaliacoes = podeVer(userPerfil?.perfil, 'verAvaliacoes')
  const podeEditar = podeVer(userPerfil?.perfil, 'editarColaborador')

  useEffect(() => { carregar() }, [id])

  async function carregar() {
    setLoading(true)
    const { data } = await supabase
      .from('colaboradores').select('*').eq('id', id).single()
    setColab(data)
    if (data?.skills_json) setSkills(data.skills_json)

    if (verAvaliacoes) {
      const { data: avs } = await supabase
        .from('avaliacoes')
        .select('*, autor:users_soma(nome)')
        .eq('colaborador_id', id)
        .order('created_at', { ascending: false })
      setAvaliacoes(avs ?? [])
    }
    setLoading(false)
  }

  async function salvarSkills() {
    setSalvandoSkills(true)
    const vals = Object.values(skills).filter(v => v > 0)
    const score = vals.length
      ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
      : 0
    await supabase.from('colaboradores')
      .update({ skills_json: skills, score_geral: score })
      .eq('id', id)
    await carregar()
    setSalvandoSkills(false)
  }

  async function analisarComIA() {
    setAnalisando(true)
    try {
      const payload = {
        ...colab,
        avaliacoes: avaliacoes.map(a => `[${a.autor?.nome}]: ${a.texto}`).join('\n'),
      }
      const resultado = await analisarPerfilColaborador(payload)

      const skillsMescladas = {}
      SKILLS_CONFIG.forEach(s => {
        skillsMescladas[s.id] = (skills[s.id] > 0)
          ? skills[s.id]
          : (resultado.skills?.[s.id] ?? 0)
      })

      await supabase.from('colaboradores').update({
        skills_json: skillsMescladas,
        score_geral: resultado.score_geral,
        perfil_ia: resultado.perfil_ia,
        analise_json: resultado,
      }).eq('id', id)

      await carregar()
    } catch (e) {
      alert('Erro na análise: ' + e.message)
    }
    setAnalisando(false)
  }

  async function salvarAvaliacao(texto, tipo) {
    if (!texto.trim()) return
    await supabase.from('avaliacoes').insert({
      colaborador_id: id,
      autor_id: userPerfil?.id,
      tipo,
      texto,
    })
    setModalTipo(null)
    await carregar()
  }

  if (loading) return <p className={styles.estado}>Carregando ficha...</p>
  if (!colab) return <p className={styles.estado}>Colaborador não encontrado.</p>

  const analiseIA = colab.analise_json || {}
  const abasFiltradas = ABAS.filter(a => !a.restrito || verFinanceiro)

  return (
    <div className={styles.page}>
      <button className={styles.voltar} onClick={() => navigate('/colaboradores')}>
        ← Voltar
      </button>

      {/* Cabeçalho */}
      <div className={styles.cabecalho}>
        <div className={styles.avatarWrap}>
          {colab.foto_url
            ? <img src={colab.foto_url} className={styles.avatarImg} alt={colab.nome} />
            : <span className={styles.avatarLetra}>{iniciais(colab.nome)}</span>
          }
        </div>
        <div className={styles.cabecalhoInfo}>
          <h1 className={styles.nome}>{colab.nome}</h1>
          <p className={styles.cargo}>
            {colab.cargo || '—'}{colab.departamento ? ` · ${colab.departamento}` : ''}
          </p>
          <div className={styles.tags}>
            <span className={`${styles.tag} ${styles['tag_' + colab.status]}`}>
              {colab.status}
            </span>
            {colab.data_admissao && (
              <span className={styles.tag}>
                desde {new Date(colab.data_admissao + 'T00:00').toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
              </span>
            )}
            {colab.score_geral > 0 && (
              <span className={`${styles.tag} ${styles.tagScore}`}>
                Score {colab.score_geral}
              </span>
            )}
          </div>
        </div>
        {podeEditar && (
          <button className={styles.btnEditar}
            onClick={() => navigate(`/colaboradores/${id}/editar`)}>
            Editar
          </button>
        )}
      </div>

      {/* Abas */}
      <div className={styles.abas}>
        {abasFiltradas.map(a => (
          <button key={a.id}
            className={aba === a.id ? `${styles.aba} ${styles.abaActive}` : styles.aba}
            onClick={() => setAba(a.id)}
          >
            {a.label}
            {a.restrito && <span className={styles.lock}>🔒</span>}
          </button>
        ))}
      </div>

      {/* Conteúdo */}
      <div className={styles.conteudo}>

        {aba === 'pessoal' && (
          <div className={styles.secao}>
            <div className={styles.grid2}>
              <Campo label="Data de nascimento" valor={colab.data_nascimento ? new Date(colab.data_nascimento + 'T00:00').toLocaleDateString('pt-BR') : null} />
              <Campo label="Estado civil" valor={colab.estado_civil} />
              <Campo label="Filhos" valor={colab.filhos} />
              <Campo label="WhatsApp" valor={colab.whatsapp} />
              <Campo label="Email" valor={colab.email} />
              <Campo label="Endereço" valor={colab.endereco} fullWidth />
            </div>
          </div>
        )}

        {aba === 'perfil' && (
          <div className={styles.secao}>
            <p className={styles.secaoTitulo}>Estilo de vida</p>
            <div className={styles.grid2}>
              <Campo label="Fuma" valor={colab.fuma} />
              <Campo label="Bebe" valor={colab.bebe} />
              <Campo label="Atividade física" valor={colab.atividade_fisica} />
              <Campo label="Religião" valor={colab.religiao} />
            </div>
            <div className={styles.divisor} />
            <p className={styles.secaoTitulo}>Interesses & sonhos</p>
            <div className={styles.grid2}>
              <Campo label="Hobbies" valor={colab.hobbies} fullWidth />
              <Campo label="Objetivo profissional" valor={colab.objetivo_profissional} fullWidth />
            </div>
            {colab.maior_sonho && (
              <div className={styles.sonhoBox}>
                <p className={styles.sonhoLabel}>Maior sonho</p>
                <p className={styles.sonhoTexto}>"{colab.maior_sonho}"</p>
              </div>
            )}
          </div>
        )}

        {aba === 'formacao' && (
          <div className={styles.secao}>
            <div className={styles.grid2}>
              <Campo label="Escolaridade" valor={colab.escolaridade} />
              <Campo label="Graduação" valor={colab.graduacao} />
              <Campo label="Cursos / certificações" valor={colab.cursos} fullWidth />
              <Campo label="Idiomas" valor={colab.idiomas} />
              <Campo label="Interesses na carteira" valor={colab.interesses_carteira} fullWidth />
            </div>
          </div>
        )}

        {aba === 'skills' && (
          <SecaoSkills
            skills={skills}
            setSkills={setSkills}
            analiseIA={analiseIA}
            analisando={analisando}
            salvandoSkills={salvandoSkills}
            onSalvar={salvarSkills}
            onAnalisar={analisarComIA}
            podeEditar={podeEditar}
          />
        )}

        {aba === 'comportamental' && (
          <SecaoComportamental analise={colab.analise_json || {}} />
        )}

        {aba === 'financeiro' && verFinanceiro && (
          <div className={styles.secao}>
            <div className={styles.alertaRestrito}>
              🔒 Informações confidenciais
            </div>
            <div className={styles.grid2}>
              <Campo label="Salário atual" valor={colab.salario ? `R$ ${Number(colab.salario).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : null} />
              <Campo label="Último reajuste" valor={colab.ultimo_reajuste} />
              <Campo label="Benefícios" valor={colab.beneficios} fullWidth />
            </div>
          </div>
        )}

        {aba === 'pdi' && verAvaliacoes && (
          <div className={styles.secao}>
            <div className={styles.pdiHeader}>
              <p className={styles.secaoTitulo}>Avaliações e elogios</p>
              {podeEditar && (
                <div className={styles.pdiAcoes}>
                  <button className={styles.btnAdd} onClick={() => setModalTipo('elogio')}>+ Elogio</button>
                  <button className={styles.btnAdd} onClick={() => setModalTipo('avaliacao')}>+ Avaliação</button>
                </div>
              )}
            </div>

            {avaliacoes.length === 0 ? (
              <p className={styles.vazio}>Nenhum registro ainda.</p>
            ) : avaliacoes.map(a => (
              <div key={a.id} className={`${styles.avaliacaoCard} ${styles['aval_' + a.tipo]}`}>
                <div className={styles.avaliacaoHeader}>
                  <span className={styles.avaliacaoAutor}>{a.autor?.nome || '—'}</span>
                  <span className={`${styles.avaliacaoTipo}`}>{a.tipo}</span>
                  <span className={styles.avaliacaoData}>{formatarData(a.created_at)}</span>
                </div>
                <p className={styles.avaliacaoTexto}>{a.texto}</p>
              </div>
            ))}

            {colab.pdi && (
              <>
                <div className={styles.divisor} />
                <p className={styles.secaoTitulo}>PDI — Plano de desenvolvimento</p>
                <div className={styles.pdiBox}>
                  <p className={styles.pdiTexto}>{colab.pdi}</p>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Modal avaliação */}
      {modalTipo && (
        <ModalAvaliacao
          tipo={modalTipo}
          onClose={() => setModalTipo(null)}
          onSalvar={salvarAvaliacao}
        />
      )}
    </div>
  )
}

// ── Seção Skills ──────────────────────────────────────────────────

function SecaoSkills({ skills, setSkills, analiseIA, analisando, salvandoSkills, onSalvar, onAnalisar, podeEditar }) {
  const grupos = ['Interpessoal', 'Executivo', 'Crescimento']
  const APTO = {
    'apto': { label: 'Apto', cls: 'aptoSim' },
    'parcialmente apto': { label: 'Parcial', cls: 'aptoParcial' },
    'não indicado': { label: 'Não indicado', cls: 'aptoNao' },
  }

  return (
    <div className={styles.secao}>
      {Object.keys(analiseIA).length > 0 && (
        <>
          <p className={styles.secaoTitulo}>Perfis de atuação</p>
          <div className={styles.perfisGrid}>
            {PERFIS_ATUACAO.map(p => {
              const val = analiseIA[p.id] || 'não avaliado'
              const info = APTO[val] || { label: 'Não avaliado', cls: 'aptoNeutro' }
              return (
                <div key={p.id} className={styles.perfilCard}>
                  <span className={styles.perfilIcon}>{p.icon}</span>
                  <span className={styles.perfilLabel}>{p.label}</span>
                  <span className={`${styles.perfilBadge} ${styles[info.cls]}`}>{info.label}</span>
                </div>
              )
            })}
          </div>

          {analiseIA.perfil_ia && (
            <div className={styles.perfilIABox}>
              <p className={styles.secaoTitulo}>Análise da IA</p>
              <p className={styles.texto}>{analiseIA.perfil_ia}</p>
              {analiseIA.recomendacao_cargo && (
                <p className={styles.recCargo}>
                  Cargo recomendado: <strong>{analiseIA.recomendacao_cargo}</strong>
                </p>
              )}
            </div>
          )}

          {analiseIA.pontos_fortes?.length > 0 && (
            <div className={styles.chipRow}>
              {analiseIA.pontos_fortes.map((p, i) => (
                <span key={i} className={styles.chipVerde}>{p}</span>
              ))}
            </div>
          )}
          {analiseIA.pontos_desenvolver?.length > 0 && (
            <div className={styles.chipRow}>
              {analiseIA.pontos_desenvolver.map((p, i) => (
                <span key={i} className={styles.chipAmbar}>{p}</span>
              ))}
            </div>
          )}
          <div className={styles.divisor} />
        </>
      )}

      {grupos.map(grupo => (
        <div key={grupo} className={styles.skillGrupo}>
          <p className={styles.secaoTitulo}>{grupo}</p>
          {SKILLS_CONFIG.filter(s => s.grupo === grupo).map(s => {
            const val = skills[s.id] ?? 0
            const cor = val >= 75 ? 'alto' : val >= 50 ? 'medio' : val > 0 ? 'baixo' : 'zero'
            return (
              <div key={s.id} className={styles.skillRow}>
                <span className={styles.skillLabel}>{s.label}</span>
                {podeEditar ? (
                  <input type="range" min={0} max={100} step={5}
                    value={val}
                    onChange={e => setSkills(sk => ({ ...sk, [s.id]: Number(e.target.value) }))}
                    className={styles.slider}
                  />
                ) : (
                  <div className={styles.skillBar}>
                    <div className={`${styles.skillFill} ${styles['fill_' + cor]}`} style={{ width: val + '%' }} />
                  </div>
                )}
                <span className={`${styles.skillNum} ${styles['num_' + cor]}`}>{val}</span>
              </div>
            )
          })}
        </div>
      ))}

      {podeEditar && (
        <div className={styles.skillAcoes}>
          <button className={styles.btnSalvarSkills} onClick={onSalvar} disabled={salvandoSkills}>
            {salvandoSkills ? 'Salvando...' : 'Salvar notas'}
          </button>
          <button className={styles.btnAnalisarIA} onClick={onAnalisar} disabled={analisando}>
            {analisando ? '⏳ Analisando...' : '🤖 Analisar perfil com IA'}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Modal avaliação ───────────────────────────────────────────────

function ModalAvaliacao({ tipo, onClose, onSalvar }) {
  const [texto, setTexto] = useState('')
  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <h3 className={styles.modalTitulo}>
          {tipo === 'elogio' ? '⭐ Adicionar elogio' : '📝 Adicionar avaliação'}
        </h3>
        <textarea
          className={styles.modalTextarea}
          rows={5}
          value={texto}
          onChange={e => setTexto(e.target.value)}
          placeholder={tipo === 'elogio' ? 'Descreva o elogio...' : 'Escreva a avaliação...'}
          autoFocus
        />
        <div className={styles.modalAcoes}>
          <button className={styles.btnSalvarSkills} onClick={() => onSalvar(texto, tipo)}>
            Salvar
          </button>
          <button className={styles.btnCancelar} onClick={onClose}>Cancelar</button>
        </div>
      </div>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────

function Campo({ label, valor, fullWidth }) {
  return (
    <div className={fullWidth ? `${styles.campo} ${styles.campoFull}` : styles.campo}>
      <span className={styles.campoLabel}>{label}</span>
      <span className={styles.campoValor}>
        {valor || <em className={styles.campoVazio}>não informado</em>}
      </span>
    </div>
  )
}

function iniciais(nome) {
  return nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
}

function formatarData(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function SecaoComportamental({ analise }) {
  const disc     = analise.disc
  const eneagrama = analise.eneagrama

  if (!disc && !eneagrama) return (
    <div className={styles.secao}>
      <div className={styles.vazio}>
        <p>Nenhum teste comportamental registrado ainda.</p>
        <p style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '6px' }}>
          Envie o formulário DISC ou Eneagrama para este colaborador pela seção de Formulários.
        </p>
      </div>
    </div>
  )

  return (
    <div className={styles.secao}>

      {disc && (
        <div className={styles.testeBox}>
          <div className={styles.testeTitulo}>
            <span className={styles.testeIcone}>📊</span>
            <span>DISC</span>
            <span className={`${styles.perfilTag} ${styles.tagDisc}`}>
              {disc.perfil_predominante}
            </span>
          </div>

          {disc.perfil_secundario && (
            <p className={styles.testeSecundario}>Perfil secundário: {disc.perfil_secundario}</p>
          )}

          {disc.descricao && (
            <p className={styles.testeDesc}>{disc.descricao}</p>
          )}

          <div className={styles.testeColunas}>
            {disc.pontos_fortes?.length > 0 && (
              <div>
                <p className={styles.testeSubtitulo}>Pontos fortes</p>
                <div className={styles.chipRow}>
                  {disc.pontos_fortes.map((p, i) => (
                    <span key={i} className={styles.chipVerde}>{p}</span>
                  ))}
                </div>
              </div>
            )}
            {disc.pontos_atencao?.length > 0 && (
              <div>
                <p className={styles.testeSubtitulo}>Pontos de atenção</p>
                <div className={styles.chipRow}>
                  {disc.pontos_atencao.map((p, i) => (
                    <span key={i} className={styles.chipAmbar}>{p}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {disc.estilo_comunicacao && (
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Comunicação</span>
              <span className={styles.infoValor}>{disc.estilo_comunicacao}</span>
            </div>
          )}

          {disc.estilo_lideranca && (
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Liderança</span>
              <span className={styles.infoValor}>{disc.estilo_lideranca}</span>
            </div>
          )}

          {disc.recomendacao_gestao && (
            <div className={styles.recBox}>
              <p className={styles.recLabel}>Recomendação para gestão</p>
              <p className={styles.texto}>{disc.recomendacao_gestao}</p>
            </div>
          )}
        </div>
      )}

      {eneagrama && (
        <div className={styles.testeBox}>
          <div className={styles.testeTitulo}>
            <span className={styles.testeIcone}>🔮</span>
            <span>Eneagrama</span>
            <span className={`${styles.perfilTag} ${styles.tagEnea}`}>
              {eneagrama.perfil_predominante}
            </span>
          </div>

          {eneagrama.asa && (
            <p className={styles.testeSecundario}>Asa: {eneagrama.asa}</p>
          )}

          {eneagrama.descricao && (
            <p className={styles.testeDesc}>{eneagrama.descricao}</p>
          )}

          <div className={styles.testeColunas}>
            {eneagrama.pontos_fortes?.length > 0 && (
              <div>
                <p className={styles.testeSubtitulo}>Pontos fortes</p>
                <div className={styles.chipRow}>
                  {eneagrama.pontos_fortes.map((p, i) => (
                    <span key={i} className={styles.chipVerde}>{p}</span>
                  ))}
                </div>
              </div>
            )}
            {eneagrama.pontos_atencao?.length > 0 && (
              <div>
                <p className={styles.testeSubtitulo}>Pontos de atenção</p>
                <div className={styles.chipRow}>
                  {eneagrama.pontos_atencao.map((p, i) => (
                    <span key={i} className={styles.chipAmbar}>{p}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {eneagrama.motivacao_central && (
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Motivação central</span>
              <span className={styles.infoValor}>{eneagrama.motivacao_central}</span>
            </div>
          )}

          {eneagrama.medo_central && (
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Medo central</span>
              <span className={styles.infoValor}>{eneagrama.medo_central}</span>
            </div>
          )}

          {eneagrama.recomendacao_gestao && (
            <div className={styles.recBox}>
              <p className={styles.recLabel}>Recomendação para gestão</p>
              <p className={styles.texto}>{eneagrama.recomendacao_gestao}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}