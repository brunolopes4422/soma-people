import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { PERFIS } from '../lib/permissoes'
import { useNavigate } from 'react-router-dom'
import styles from './Auditoria.module.css'

export default function Auditoria() {
  const { perfil } = useAuth()
  const navigate   = useNavigate()

  const [logs, setLogs]       = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (perfil?.perfil !== PERFIS.SUPER_ADMIN) {
      navigate('/colaboradores')
      return
    }
    carregarLogs()
  }, [perfil])

  async function carregarLogs() {
    setLoading(true)
    const { data } = await supabase
      .from('auditoria_logs')
      .select(`
        id, acao, criado_em, detalhes,
        usuario:usuarios_people(nome, perfil),
        colaborador:colaboradores(nome)
      `)
      .order('criado_em', { ascending: false })
      .limit(200)
    setLogs(data ?? [])
    setLoading(false)
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Auditoria de acessos</h1>
          <p className={styles.subtitle}>Registro completo de quem acessou o quê e quando</p>
        </div>
        <button className={styles.btnAtualizar} onClick={carregarLogs}>Atualizar</button>
      </div>

      {loading ? (
        <p className={styles.estado}>Carregando logs...</p>
      ) : logs.length === 0 ? (
        <p className={styles.estado}>Nenhum registro encontrado.</p>
      ) : (
        <div className={styles.tabela}>
          <div className={styles.header_row}>
            <span>Data / hora</span>
            <span>Usuário</span>
            <span>Ação</span>
            <span>Colaborador</span>
          </div>
          {logs.map(log => (
            <div key={log.id} className={styles.row}>
              <span className={styles.data}>{formatarDataHora(log.criado_em)}</span>
              <span className={styles.usuario}>
                {log.usuario?.nome ?? '—'}
                <em>{log.usuario?.perfil ?? ''}</em>
              </span>
              <span className={styles.acao}>{traduzirAcao(log.acao)}</span>
              <span className={styles.colab}>{log.colaborador?.nome ?? '—'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function traduzirAcao(acao) {
  const mapa = {
    visualizou_ficha:     'Visualizou ficha',
    criou_colaborador:    'Criou colaborador',
    editou_colaborador:   'Editou colaborador',
    adicionou_avaliacao:  'Adicionou avaliação',
    adicionou_elogio:     'Adicionou elogio',
  }
  return mapa[acao] ?? acao
}

function formatarDataHora(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}
