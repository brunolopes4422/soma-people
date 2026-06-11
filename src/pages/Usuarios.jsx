import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import styles from './Usuarios.module.css'

const PERFIS = ['super_admin','gestor','rh','colaborador']

export default function Usuarios() {
  const [usuarios, setUsuarios]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [modal, setModal]         = useState(false)
  const [form, setForm]           = useState({ nome:'', email:'', perfil:'rh', senha:'' })
  const [salvando, setSalvando]   = useState(false)
  const [erro, setErro]           = useState('')

  useEffect(() => { carregar() }, [])

  async function carregar() {
    setLoading(true)
    const { data } = await supabase.from('users_soma').select('*').order('nome')
    setUsuarios(data ?? [])
    setLoading(false)
  }

  async function salvar() {
    if (!form.nome || !form.email || !form.senha) { setErro('Preencha todos os campos.'); return }
    setSalvando(true); setErro('')
    try {
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: form.email, password: form.senha, email_confirm: true,
      })
      if (authError) throw authError
      await supabase.from('users_soma').insert({
        auth_id: authData.user.id, nome: form.nome,
        email: form.email, perfil: form.perfil,
      })
      setModal(false)
      setForm({ nome:'', email:'', perfil:'rh', senha:'' })
      await carregar()
    } catch (e) {
      setErro('Erro: ' + e.message)
    }
    setSalvando(false)
  }

  async function alterarPerfil(id, perfil) {
    await supabase.from('users_soma').update({ perfil }).eq('id', id)
    await carregar()
  }

  async function toggleAtivo(id, ativo) {
    await supabase.from('users_soma').update({ ativo: !ativo }).eq('id', id)
    await carregar()
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Usuários do sistema</h1>
          <p className={styles.subtitle}>{usuarios.length} usuários cadastrados</p>
        </div>
        <button className={styles.btnNovo} onClick={() => setModal(true)}>+ Novo usuário</button>
      </div>

      {loading ? <p className={styles.estado}>Carregando...</p> : (
        <div className={styles.tabela}>
          {usuarios.map(u => (
            <div key={u.id} className={`${styles.linha} ${!u.ativo ? styles.inativo : ''}`}>
              <div className={styles.avatar}>{iniciais(u.nome)}</div>
              <div className={styles.info}>
                <span className={styles.nome}>{u.nome}</span>
                <span className={styles.email}>{u.email}</span>
              </div>
              <select
                className={styles.selectPerfil}
                value={u.perfil}
                onChange={e => alterarPerfil(u.id, e.target.value)}
              >
                {PERFIS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <button
                className={`${styles.btnToggle} ${u.ativo ? styles.btnDesativar : styles.btnAtivar}`}
                onClick={() => toggleAtivo(u.id, u.ativo)}
              >
                {u.ativo ? 'Desativar' : 'Ativar'}
              </button>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <div className={styles.overlay} onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className={styles.modal}>
            <h3 className={styles.modalTitulo}>Novo usuário</h3>
            {[
              { label: 'Nome', key: 'nome', type: 'text' },
              { label: 'Email', key: 'email', type: 'email' },
              { label: 'Senha inicial', key: 'senha', type: 'password' },
            ].map(f => (
              <div key={f.key} className={styles.campo}>
                <label>{f.label}</label>
                <input type={f.type} value={form[f.key]} onChange={e => setForm(x => ({ ...x, [f.key]: e.target.value }))} />
              </div>
            ))}
            <div className={styles.campo}>
              <label>Perfil de acesso</label>
              <select value={form.perfil} onChange={e => setForm(x => ({ ...x, perfil: e.target.value }))}>
                {PERFIS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            {erro && <p className={styles.erro}>{erro}</p>}
            <div className={styles.modalAcoes}>
              <button className={styles.btnSalvar} onClick={salvar} disabled={salvando}>
                {salvando ? 'Criando...' : 'Criar usuário'}
              </button>
              <button className={styles.btnCancelar} onClick={() => setModal(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function iniciais(nome) { return (nome||'?').split(' ').slice(0,2).map(n=>n[0]).join('').toUpperCase() }