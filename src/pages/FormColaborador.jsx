import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import styles from './FormColaborador.module.css'

const VAZIO = {
  nome: '', email: '', telefone: '', whatsapp: '',
  data_nascimento: '', cargo: '', departamento: '',
  data_admissao: '', status: 'ativo',
  estado_civil: '', filhos: '',
  escolaridade: '', graduacao: '', cursos: '', idiomas: '',
  hobbies: '', maior_sonho: '', objetivo_profissional: '',
  interesses_carteira: '', fuma: 'Não', bebe: 'Não',
  atividade_fisica: '', religiao: '', pdi: '',
}

export default function FormColaborador() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { perfil: userPerfil } = useAuth()
  const isEdicao = Boolean(id)

  const [form, setForm]       = useState(VAZIO)
  const [loading, setLoading] = useState(isEdicao)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro]       = useState('')

  useEffect(() => {
    if (isEdicao) carregarColaborador()
  }, [id])

  async function carregarColaborador() {
    const { data } = await supabase
      .from('colaboradores').select('*').eq('id', id).single()
    if (data) {
      setForm({
        nome:                data.nome || '',
        email:               data.email || '',
        telefone:            data.telefone || '',
        whatsapp:            data.whatsapp || '',
        data_nascimento:     data.data_nascimento || '',
        cargo:               data.cargo || '',
        departamento:        data.departamento || '',
        data_admissao:       data.data_admissao || '',
        status:              data.status || 'ativo',
        estado_civil:        data.estado_civil || '',
        filhos:              data.filhos || '',
        escolaridade:        data.escolaridade || '',
        graduacao:           data.graduacao || '',
        cursos:              data.cursos || '',
        idiomas:             data.idiomas || '',
        hobbies:             data.hobbies || '',
        maior_sonho:         data.maior_sonho || '',
        objetivo_profissional: data.objetivo_profissional || '',
        interesses_carteira: data.interesses_carteira || '',
        fuma:                data.fuma || 'Não',
        bebe:                data.bebe || 'Não',
        atividade_fisica:    data.atividade_fisica || '',
        religiao:            data.religiao || '',
        pdi:                 data.pdi || '',
      })
    }
    setLoading(false)
  }

  function atualizar(campo, valor) {
    setForm(f => ({ ...f, [campo]: valor }))
  }

  async function salvar() {
    if (!form.nome || !form.email) {
      setErro('Nome e email são obrigatórios.')
      return
    }
    setSalvando(true)
    setErro('')

    const payload = { ...form }
    if (!payload.data_nascimento) delete payload.data_nascimento
    if (!payload.data_admissao)   delete payload.data_admissao

    const { error } = isEdicao
      ? await supabase.from('colaboradores').update(payload).eq('id', id)
      : await supabase.from('colaboradores').insert(payload)

    if (error) {
      setErro('Erro ao salvar: ' + error.message)
      setSalvando(false)
      return
    }

    navigate('/colaboradores')
  }

  if (loading) return <p className={styles.estado}>Carregando...</p>

  return (
    <div className={styles.page}>
      <button className={styles.voltar} onClick={() => navigate('/colaboradores')}>
        ← Voltar
      </button>
      <h1 className={styles.title}>
        {isEdicao ? 'Editar colaborador' : 'Novo colaborador'}
      </h1>

      <div className={styles.secoes}>

        <Secao titulo="Dados básicos">
          <div className={styles.grid2}>
            <Campo label="Nome completo *" valor={form.nome} onChange={v => atualizar('nome', v)} />
            <Campo label="Email *" type="email" valor={form.email} onChange={v => atualizar('email', v)} />
            <Campo label="Telefone" valor={form.telefone} onChange={v => atualizar('telefone', v)} />
            <Campo label="WhatsApp" valor={form.whatsapp} onChange={v => atualizar('whatsapp', v)} />
            <Campo label="Data de nascimento" type="date" valor={form.data_nascimento} onChange={v => atualizar('data_nascimento', v)} />
            <CampoSelect label="Estado civil" valor={form.estado_civil} onChange={v => atualizar('estado_civil', v)}
              opcoes={['Solteiro(a)', 'Casado(a)', 'Divorciado(a)', 'Viúvo(a)', 'União estável']} />
            <Campo label="Filhos" valor={form.filhos} onChange={v => atualizar('filhos', v)} placeholder="Ex: 2 filhos (3 e 7 anos)" />
          </div>
        </Secao>

        <Secao titulo="Vínculo">
          <div className={styles.grid2}>
            <Campo label="Cargo" valor={form.cargo} onChange={v => atualizar('cargo', v)} />
            <Campo label="Departamento" valor={form.departamento} onChange={v => atualizar('departamento', v)} />
            <Campo label="Data de admissão" type="date" valor={form.data_admissao} onChange={v => atualizar('data_admissao', v)} />
            <CampoSelect label="Status" valor={form.status} onChange={v => atualizar('status', v)}
              opcoes={['ativo', 'afastado', 'desligado']} />
          </div>
        </Secao>

        <Secao titulo="Formação">
          <div className={styles.grid2}>
            <CampoSelect label="Escolaridade" valor={form.escolaridade} onChange={v => atualizar('escolaridade', v)}
              opcoes={['Ensino médio', 'Superior incompleto', 'Superior completo', 'Pós-graduação', 'Mestrado', 'Doutorado']} />
            <Campo label="Graduação / Curso" valor={form.graduacao} onChange={v => atualizar('graduacao', v)} placeholder="Ex: Ciências Contábeis — USP (2018)" />
            <CampoTexto label="Outros cursos / certificações" valor={form.cursos} onChange={v => atualizar('cursos', v)} fullWidth />
            <Campo label="Idiomas" valor={form.idiomas} onChange={v => atualizar('idiomas', v)} placeholder="Ex: Inglês (intermediário)" />
            <Campo label="Interesses na carteira" valor={form.interesses_carteira} onChange={v => atualizar('interesses_carteira', v)} fullWidth />
          </div>
        </Secao>

        <Secao titulo="Perfil & interesses">
          <div className={styles.grid2}>
            <CampoSelect label="Fuma" valor={form.fuma} onChange={v => atualizar('fuma', v)} opcoes={['Não', 'Sim', 'Socialmente']} />
            <CampoSelect label="Bebe" valor={form.bebe} onChange={v => atualizar('bebe', v)} opcoes={['Não', 'Sim', 'Socialmente']} />
            <Campo label="Atividade física" valor={form.atividade_fisica} onChange={v => atualizar('atividade_fisica', v)} />
            <Campo label="Religião" valor={form.religiao} onChange={v => atualizar('religiao', v)} />
            <CampoTexto label="Hobbies" valor={form.hobbies} onChange={v => atualizar('hobbies', v)} fullWidth />
            <CampoTexto label="Objetivo profissional" valor={form.objetivo_profissional} onChange={v => atualizar('objetivo_profissional', v)} fullWidth />
            <CampoTexto label="Maior sonho" valor={form.maior_sonho} onChange={v => atualizar('maior_sonho', v)} fullWidth />
          </div>
        </Secao>

        <Secao titulo="PDI — Plano de Desenvolvimento">
          <CampoTexto label="Metas e plano de desenvolvimento" valor={form.pdi} onChange={v => atualizar('pdi', v)} rows={5} fullWidth />
        </Secao>

      </div>

      {erro && <p className={styles.erro}>{erro}</p>}

      <div className={styles.acoes}>
        <button className={styles.btnSalvar} onClick={salvar} disabled={salvando}>
          {salvando ? 'Salvando...' : isEdicao ? 'Salvar alterações' : 'Cadastrar colaborador'}
        </button>
        <button className={styles.btnCancelar} onClick={() => navigate('/colaboradores')}>
          Cancelar
        </button>
      </div>
    </div>
  )
}

function Secao({ titulo, children }) {
  return (
    <div className={styles.secao}>
      <p className={styles.secaoTitulo}>{titulo}</p>
      {children}
    </div>
  )
}

function Campo({ label, valor, onChange, type = 'text', placeholder, fullWidth }) {
  return (
    <div className={fullWidth ? `${styles.campo} ${styles.campoFull}` : styles.campo}>
      <label>{label}</label>
      <input type={type} value={valor} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  )
}

function CampoTexto({ label, valor, onChange, rows = 3, fullWidth }) {
  return (
    <div className={fullWidth ? `${styles.campo} ${styles.campoFull}` : styles.campo}>
      <label>{label}</label>
      <textarea rows={rows} value={valor} onChange={e => onChange(e.target.value)} />
    </div>
  )
}

function CampoSelect({ label, valor, onChange, opcoes }) {
  return (
    <div className={styles.campo}>
      <label>{label}</label>
      <select value={valor} onChange={e => onChange(e.target.value)}>
        <option value="">Selecione...</option>
        {opcoes.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}