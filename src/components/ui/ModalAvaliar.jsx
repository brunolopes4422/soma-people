import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import styles from './ModalAvaliar.module.css'

export default function ModalAvaliar({ colaboradorId, tipo, onClose, onSalvo }) {
  // tipo: 'avaliacao' | 'elogio'
  const { perfil } = useAuth()
  const [texto, setTexto]   = useState('')
  const [origem, setOrigem] = useState('') // só para elogios
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro]     = useState('')

  const isElogio = tipo === 'elogio'

  async function salvar() {
    if (!texto.trim()) { setErro('Escreva o conteúdo antes de salvar.'); return }
    setSalvando(true); setErro('')

    let error
    if (isElogio) {
      ;({ error } = await supabase.from('elogios').insert({
        colaborador_id: colaboradorId,
        texto: texto.trim(),
        origem: origem.trim() || 'Liderança interna',
      }))
    } else {
      ;({ error } = await supabase.from('avaliacoes').insert({
        colaborador_id: colaboradorId,
        autor_id: perfil?.id,
        texto: texto.trim(),
      }))
    }

    if (error) { setErro('Erro ao salvar: ' + error.message); setSalvando(false); return }

    // Registrar no log de auditoria
    await supabase.from('auditoria_logs').insert({
      acao: isElogio ? 'adicionou_elogio' : 'adicionou_avaliacao',
      colaborador_id: colaboradorId,
      usuario_id: perfil?.id,
    })

    onSalvo()
    onClose()
  }

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.titulo}>
            {isElogio ? '🏅 Adicionar elogio' : '📋 Adicionar avaliação'}
          </h2>
          <button className={styles.btnFechar} onClick={onClose}>✕</button>
        </div>

        <div className={styles.corpo}>
          {isElogio && (
            <div className={styles.campo}>
              <label>Origem do elogio</label>
              <input
                value={origem}
                onChange={e => setOrigem(e.target.value)}
                placeholder="Ex: Cliente direto, Bruno (interno), Léo..."
              />
            </div>
          )}

          <div className={styles.campo}>
            <label>{isElogio ? 'Elogio recebido' : 'Avaliação'}</label>
            <textarea
              rows={5}
              value={texto}
              onChange={e => setTexto(e.target.value)}
              placeholder={
                isElogio
                  ? 'Descreva o elogio recebido, contexto e impacto...'
                  : 'Escreva sua avaliação sobre este colaborador. Seja específico sobre comportamentos, entregas e desenvolvimento...'
              }
              autoFocus
            />
            <span className={styles.contador}>{texto.length} caracteres</span>
          </div>

          {erro && <p className={styles.erro}>{erro}</p>}
        </div>

        <div className={styles.rodape}>
          <button className={styles.btnCancelar} onClick={onClose}>Cancelar</button>
          <button className={styles.btnSalvar} onClick={salvar} disabled={salvando || !texto.trim()}>
            {salvando ? 'Salvando...' : isElogio ? 'Salvar elogio' : 'Salvar avaliação'}
          </button>
        </div>
      </div>
    </div>
  )
}
