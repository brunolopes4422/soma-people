export const PERFIS = {
  SUPER_ADMIN: 'super_admin',
  GESTOR:      'gestor',
  RH:          'rh',
  COLABORADOR: 'colaborador',
}

const PERMISSOES = {
  super_admin: {
    verFinanceiro:    true,
    verAvaliacoes:    true,
    editarColaborador:true,
    deletarRegistros: true,
    verAuditoria:     true,
    gerirUsuarios:    true,
    criarFormularios: true,
    verCandidatos:    true,
    aprovarSnapshots: true,
  },
  gestor: {
    verFinanceiro:    false,
    verAvaliacoes:    true,
    editarColaborador:true,
    deletarRegistros: false,
    verAuditoria:     false,
    gerirUsuarios:    false,
    criarFormularios: false,
    verCandidatos:    true,
    aprovarSnapshots: true,
  },
  rh: {
    verFinanceiro:    false,
    verAvaliacoes:    true,
    editarColaborador:true,
    deletarRegistros: false,
    verAuditoria:     false,
    gerirUsuarios:    false,
    criarFormularios: true,
    verCandidatos:    true,
    aprovarSnapshots: true,
  },
  colaborador: {
    verFinanceiro:    false,
    verAvaliacoes:    false,
    editarColaborador:false,
    deletarRegistros: false,
    verAuditoria:     false,
    gerirUsuarios:    false,
    criarFormularios: false,
    verCandidatos:    false,
    aprovarSnapshots: false,
  },
}

export function podeVer(perfil, permissao) {
  return PERMISSOES[perfil]?.[permissao] ?? false
}

export function isAdmin(perfil) {
  return perfil === PERFIS.SUPER_ADMIN
}

export function isRH(perfil) {
  return perfil === PERFIS.RH || perfil === PERFIS.SUPER_ADMIN
}