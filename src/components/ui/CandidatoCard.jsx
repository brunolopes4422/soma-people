import styles from './CandidatoCard.module.css'

const SKILL_LABELS = {
  comunicacao:  'Comunicação',
  organizacao:  'Organização',
  lideranca:    'Liderança',
  tecnico:      'Técnico',
  proatividade: 'Proatividade',
}

const NIVEL_LABEL = { iniciante: 'Iniciante', medio: 'Médio', avancado: 'Avançado' }
const STATUS_LABEL = { novo: 'Novo', analisado: 'Analisado', aprovado: 'Aprovado', rejeitado: 'Rejeitado' }

export default function CandidatoCard({ candidato, onVerPerfil, onAprovar, onRejeitar, destaque }) {
  const skills = candidato.skills_json || {}
  const score  = candidato.score_geral ?? 0
  const cor    = score >= 75 ? 'alto' : score >= 50 ? 'medio' : 'baixo'

  return (
    <div className={`${styles.card} ${destaque ? styles.destaque : ''}`}>
      {/* Cabeçalho do card */}
      <div className={styles.topo}>
        <div className={styles.avatar}>{iniciais(candidato.nome)}</div>
        <div className={styles.info}>
          <span className={styles.nome}>{candidato.nome}</span>
          <span className={styles.area}>{candidato.analise_json?.area_indicada || '—'}</span>
          <div className={styles.badges}>
            {candidato.nivel && (
              <span className={`${styles.badge} ${styles['nivel_' + candidato.nivel]}`}>
                {NIVEL_LABEL[candidato.nivel]}
              </span>
            )}
            <span className={`${styles.badge} ${styles['status_' + candidato.status]}`}>
              {STATUS_LABEL[candidato.status]}
            </span>
          </div>
        </div>
        <div className={`${styles.scoreCircle} ${styles['score_' + cor]}`}>
          <span className={styles.scoreNum}>{score}</span>
          <span className={styles.scoreLabel}>score</span>
        </div>
      </div>

      {/* Skills como barras */}
      {candidato.skills_json && (
        <div className={styles.skills}>
          {Object.entries(SKILL_LABELS).map(([key, label]) => {
            const val = skills[key] ?? 0
            return (
              <div key={key} className={styles.skillRow}>
                <span className={styles.skillLabel}>{label}</span>
                <div className={styles.skillBar}>
                  <div
                    className={`${styles.skillFill} ${styles['fill_' + (val >= 75 ? 'alto' : val >= 50 ? 'medio' : 'baixo')]}`}
                    style={{ width: val + '%' }}
                  />
                </div>
                <span className={styles.skillVal}>{val}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Perfil resumido */}
      {candidato.analise_json?.perfil && (
        <p className={styles.perfil}>{candidato.analise_json.perfil}</p>
      )}

      {/* Habilidades chips */}
      {candidato.analise_json?.habilidades?.length > 0 && (
        <div className={styles.habilidades}>
          {candidato.analise_json.habilidades.slice(0, 4).map((h, i) => (
            <span key={i} className={styles.chip}>{h}</span>
          ))}
        </div>
      )}

      {/* Ações */}
      <div className={styles.acoes}>
        <button className={styles.btnPerfil} onClick={() => onVerPerfil(candidato)}>
          Ver perfil completo
        </button>
        {candidato.status !== 'aprovado' && (
          <button className={styles.btnAprovar} onClick={() => onAprovar(candidato.id)}>
            Aprovar
          </button>
        )}
        {candidato.status !== 'rejeitado' && (
          <button className={styles.btnRejeitar} onClick={() => onRejeitar(candidato.id)}>
            Rejeitar
          </button>
        )}
      </div>

      {/* Data */}
      <span className={styles.data}>
        {new Date(candidato.created_at).toLocaleDateString('pt-BR')}
      </span>
    </div>
  )
}

function iniciais(nome) {
  return (nome || '?').split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
}
