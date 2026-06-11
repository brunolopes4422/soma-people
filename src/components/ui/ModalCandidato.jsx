import styles from './ModalCandidato.module.css'
import { supabase } from '../../lib/supabase'

const SKILL_LABELS = {
  comunicacao: 'Comunicação', organizacao: 'Organização',
  lideranca: 'Liderança', tecnico: 'Técnico', proatividade: 'Proatividade',
}

const REC_STYLE = {
  contratar:     { label: 'Contratar',    cls: 'recContratar' },
  talvez:        { label: 'Talvez',       cls: 'recTalvez'    },
  nao_contratar: { label: 'Não contratar',cls: 'recNao'       },
}

export default function ModalCandidato({ candidato, onClose, onAprovar, onRejeitar, onConverter, onAnalisar }) {
  const analise   = candidato.analise_json || {}
  const detalhe   = candidato._analise_detalhe || {}
  const carregando = candidato._carregando
  const skills    = candidato.skills_json || {}
  const score     = candidato.score_geral ?? 0
  const respostas = candidato.respostas_json || {}
  const corScore  = score >= 75 ? 'alto' : score >= 50 ? 'medio' : 'baixo'

  const recKey  = detalhe.recomendacao_final
  const recInfo = REC_STYLE[recKey] || null

  async function baixarCurriculo() {
    const { data } = await supabase.storage
      .from('curriculos')
      .createSignedUrl(candidato.curriculo_url, 60)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>

        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerInfo}>
            <div className={styles.avatar}>{iniciais(candidato.nome)}</div>
            <div>
              <h2 className={styles.nome}>{candidato.nome}</h2>
              <p className={styles.meta}>
                {candidato.email}
                {candidato.telefone && ` · ${candidato.telefone}`}
                {analise.area_indicada && ` · ${analise.area_indicada}`}
              </p>
            </div>
          </div>
          <div className={styles.headerAcoes}>
            <div className={`${styles.scoreGrande} ${styles['score_' + corScore]}`}>
              <span className={styles.scoreNum}>{score}</span>
              <span className={styles.scoreLabel}>score</span>
            </div>
            <button className={styles.btnFechar} onClick={onClose}>✕</button>
          </div>
        </div>

        {/* Corpo */}
        <div className={styles.corpo}>

          {/* Coluna esquerda */}
          <div className={styles.col}>

            {/* Skills */}
            {Object.keys(skills).length > 0 && (
              <div className={styles.secao}>
                <p className={styles.secaoTitulo}>Skills</p>
                {Object.entries(SKILL_LABELS).map(([key, label]) => {
                  const val = skills[key] ?? 0
                  const cor = val >= 75 ? 'alto' : val >= 50 ? 'medio' : 'baixo'
                  return (
                    <div key={key} className={styles.skillRow}>
                      <span className={styles.skillLabel}>{label}</span>
                      <div className={styles.skillBar}>
                        <div className={`${styles.skillFill} ${styles['fill_' + cor]}`} style={{ width: val + '%' }} />
                      </div>
                      <span className={styles.skillVal}>{val}</span>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Habilidades */}
            {analise.habilidades?.length > 0 && (
              <div className={styles.secao}>
                <p className={styles.secaoTitulo}>Habilidades identificadas</p>
                <div className={styles.chips}>
                  {analise.habilidades.map((h, i) => (
                    <span key={i} className={styles.chipVerde}>{h}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Pontos fracos */}
            {analise.pontos_fracos?.length > 0 && (
              <div className={styles.secao}>
                <p className={styles.secaoTitulo}>Pontos de atenção</p>
                <div className={styles.chips}>
                  {analise.pontos_fracos.map((p, i) => (
                    <span key={i} className={styles.chipVermelho}>{p}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Perfil comportamental */}
            {analise.perfil && (
              <div className={styles.secao}>
                <p className={styles.secaoTitulo}>Perfil comportamental</p>
                <p className={styles.texto}>{analise.perfil}</p>
              </div>
            )}

            {/* Currículo */}
            {candidato.curriculo_url && (
              <div className={styles.secao}>
                <p className={styles.secaoTitulo}>Currículo</p>
                <p className={styles.texto}>{candidato.curriculo_url.split('/').pop()}</p>
                <button className={styles.btnDownload} onClick={baixarCurriculo}>
                  ↓ Baixar currículo
                </button>
              </div>
            )}

          </div>

          {/* Coluna direita */}
          <div className={styles.col}>

            {/* Análise IA detalhada */}
            {carregando ? (
              <div className={styles.secao}>
                <p className={styles.carregando}>⏳ Gerando análise estratégica...</p>
              </div>
            ) : detalhe.resumo_executivo ? (
              <>
                <div className={styles.secao}>
                  <p className={styles.secaoTitulo}>Análise estratégica IA</p>
                  <p className={styles.texto}>{detalhe.resumo_executivo}</p>
                </div>

                {detalhe.pontos_fortes?.length > 0 && (
                  <div className={styles.secao}>
                    <p className={styles.secaoTitulo}>Pontos fortes</p>
                    <ul className={styles.lista}>
                      {detalhe.pontos_fortes.map((p, i) => <li key={i}>{p}</li>)}
                    </ul>
                  </div>
                )}

                {detalhe.riscos?.length > 0 && (
                  <div className={styles.secao}>
                    <p className={styles.secaoTitulo}>Riscos</p>
                    <ul className={styles.listaRisco}>
                      {detalhe.riscos.map((r, i) => <li key={i}>{r}</li>)}
                    </ul>
                  </div>
                )}

                {detalhe.alertas && (
                  <div className={styles.alertaBox}>
                    <span className={styles.alertaIcon}>⚠</span>
                    <p className={styles.alertaTexto}>{detalhe.alertas}</p>
                  </div>
                )}

                {recInfo && (
                  <div className={`${styles.recBox} ${styles[recInfo.cls]}`}>
                    <strong>Recomendação:</strong> {recInfo.label}
                    {detalhe.justificativa && <span> — {detalhe.justificativa}</span>}
                  </div>
                )}
              </>
            ) : (
              candidato.status === 'novo' && (
                <div className={styles.secao}>
                  <button className={styles.btnAnalisarIA} onClick={onAnalisar}>
                    🤖 Analisar candidato com IA
                  </button>
                  <p className={styles.dicaIA}>Gera skills, score e análise estratégica completa</p>
                </div>
              )
            )}

            {/* Respostas */}
            {Object.keys(respostas).length > 0 && (
              <div className={styles.secao}>
                <p className={styles.secaoTitulo}>Respostas do candidato</p>
                {[
                  ['objetivo',      'Objetivo profissional'],
                  ['pontos_fortes', 'Em que é bom'],
                  ['dificuldades',  'Dificuldades'],
                  ['ambiente',      'Ambiente preferido'],
                  ['diferencial',   'Por que contratar'],
                ].map(([key, label]) => respostas[key] ? (
                  <div key={key} className={styles.resposta}>
                    <span className={styles.respostaLabel}>{label}</span>
                    <p className={styles.respostaTexto}>{respostas[key]}</p>
                  </div>
                ) : null)}
              </div>
            )}

          </div>
        </div>

        {/* Rodapé */}
        <div className={styles.rodape}>
          {candidato.status !== 'aprovado' && (
            <button className={styles.btnAprovar} onClick={() => onAprovar(candidato.id)}>
              ✓ Aprovar candidato
            </button>
          )}
          <button className={styles.btnConverter} onClick={() => onConverter(candidato)}>
            → Converter em colaborador
          </button>
          {candidato.status !== 'rejeitado' && (
            <button className={styles.btnRejeitar} onClick={() => onRejeitar(candidato.id)}>
              ✕ Rejeitar
            </button>
          )}
        </div>

      </div>
    </div>
  )
}

function iniciais(nome) {
  return (nome || '?').split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
}