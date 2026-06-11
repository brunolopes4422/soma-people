const GROQ_API = 'https://api.groq.com/openai/v1/chat/completions'
const MODEL    = 'llama-3.3-70b-versatile'
const GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY || ''

async function chamarIA(systemPrompt, userContent, maxTokens = 1200) {
  if (!GROQ_KEY) throw new Error('VITE_GROQ_API_KEY não configurada no .env.local')
  const res = await fetch(GROQ_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      temperature: 0.3,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userContent  },
      ],
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Erro Groq ${res.status}: ${err}`)
  }
  const data = await res.json()
  return data.choices[0].message.content
}

function parseJSON(texto) {
  const match = texto.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('JSON não encontrado na resposta da IA')
  return JSON.parse(match[0])
}

// ── 1. Analisar candidato ────────────────────────────────────────

export async function analisarCandidato({ curriculo, pdfBase64, respostas }) {
  const system = `Você é especialista em RH. Retorne SOMENTE JSON válido, sem markdown.`
  const user = `Analise o candidato e retorne exatamente neste JSON:
{
  "nivel": "iniciante|medio|avancado",
  "habilidades": ["h1","h2","h3"],
  "pontos_fracos": ["p1","p2"],
  "area_indicada": "área",
  "perfil": "resumo comportamental em 2-3 frases",
  "resumo": "análise executiva em 3-4 frases",
  "riscos": "principais riscos",
  "recomendacao": "recomendação de encaixe",
  "skills": {
    "comunicacao":0,"organizacao":0,"lideranca":0,
    "tecnico":0,"proatividade":0
  },
  "score_geral": 0
}

CURRÍCULO: ${curriculo || '(não fornecido)'}
${pdfBase64 ? 'NOTA: PDF do currículo disponível.' : ''}
RESPOSTAS:
1. Objetivo: ${respostas?.objetivo || ''}
2. Pontos fortes: ${respostas?.pontos_fortes || ''}
3. Dificuldades: ${respostas?.dificuldades || ''}
4. Ambiente: ${respostas?.ambiente || ''}
5. Diferencial: ${respostas?.diferencial || ''}`
  return parseJSON(await chamarIA(system, user))
}

// ── 2. Analisar perfil do colaborador ────────────────────────────

export async function analisarPerfilColaborador(colaborador) {
  const system = `Você é consultor sênior de RH. Retorne SOMENTE JSON válido, sem markdown.`
  const user = `Analise o colaborador e retorne exatamente neste JSON:
{
  "skills": {
    "comunicacao":0,"relacionamento_cliente":0,"trabalho_equipe":0,
    "lideranca":0,"organizacao":0,"execucao":0,"proatividade":0,
    "resiliencia":0,"facilidade_aprendizado":0,"autodidata":0,
    "vendas":0,"visao_estrategica":0
  },
  "score_geral": 0,
  "perfil_ia": "análise comportamental em 4-5 frases",
  "perfil_campo": "apto|parcialmente apto|não indicado",
  "perfil_atendimento": "apto|parcialmente apto|não indicado",
  "perfil_execucao": "apto|parcialmente apto|não indicado",
  "perfil_lideranca": "apto|parcialmente apto|não indicado",
  "perfil_prova_fogo": "apto|parcialmente apto|não indicado",
  "pontos_fortes": ["item1","item2","item3"],
  "pontos_desenvolver": ["item1","item2"],
  "recomendacao_cargo": "cargo ideal"
}

Nome: ${colaborador.nome} | Cargo: ${colaborador.cargo || ''} | Depto: ${colaborador.departamento || ''}
Admissão: ${colaborador.data_admissao || ''} | Objetivo: ${colaborador.objetivo_profissional || ''}
Avaliações: ${colaborador.avaliacoes || '(nenhuma)'}
Elogios: ${colaborador.elogios || '(nenhum)'}
PDI: ${colaborador.pdi || '(não preenchido)'}`
  return parseJSON(await chamarIA(system, user, 1500))
}

// ── 3. Gerar snapshot IA ─────────────────────────────────────────

export async function analisarSnapshot(colaborador, skills, avaliacoes, pdi) {
  const system = `Você é analista sênior de RH. Retorne SOMENTE JSON válido, sem markdown.`
  const user = `Analise o colaborador e retorne exatamente neste JSON:
{
  "resumo": "máximo 5 linhas sobre perfil atual",
  "pontos_fortes": ["ponto1","ponto2","ponto3"],
  "pontos_fracos": ["ponto1","ponto2"],
  "risco": "low|medium|high",
  "justificativa_risco": "explicação do risco",
  "recomendacao": "próximos passos"
}

Nome: ${colaborador.nome} | Cargo: ${colaborador.cargo || ''}
Tempo de casa: ${calcularTempo(colaborador.data_admissao)}
Skills: ${JSON.stringify(skills)}
Avaliações: ${(avaliacoes || []).map(a => a.texto).join(' | ')}
PDI: ${pdi || '(não preenchido)'}`
  return parseJSON(await chamarIA(system, user))
}

// ── 4. Comparar snapshots ────────────────────────────────────────

export async function compararSnapshots(snapshotAntigo, snapshotAtual, colaborador) {
  const system = `Você é analista de RH. Retorne SOMENTE JSON válido, sem markdown.`
  const user = `Compare os dois momentos do colaborador e retorne exatamente neste JSON:
{
  "evolucao_geral": "melhorou|piorou|estavel",
  "resumo_evolucao": "2-3 frases sobre a evolução",
  "melhorias": ["item1","item2"],
  "quedas": ["item1","item2"],
  "recomendacao_acao": "o que fazer agora"
}

Colaborador: ${colaborador.nome}

SNAPSHOT ANTIGO (${snapshotAntigo.snapshot_date}):
Score: ${snapshotAntigo.overall_score}
Skills: ${JSON.stringify(snapshotAntigo.skills_snapshot)}

SNAPSHOT ATUAL (${snapshotAtual.snapshot_date}):
Score: ${snapshotAtual.overall_score}
Skills: ${JSON.stringify(snapshotAtual.skills_snapshot)}`
  return parseJSON(await chamarIA(system, user))
}

// ── 5. Interpretar busca ─────────────────────────────────────────

export async function interpretarBusca(textoBusca) {
  const system = `Converta buscas de RH em JSON estruturado. Retorne SOMENTE JSON válido.`
  const user = `Converta: "${textoBusca}"
Retorne exatamente:
{
  "nivel": "iniciante|medio|avancado|qualquer",
  "area": "área ou vazio",
  "skills_desejadas": {
    "comunicacao":0.0,"organizacao":0.0,"lideranca":0.0,
    "tecnico":0.0,"proatividade":0.0
  },
  "score_minimo": 0,
  "descricao_interpretada": "frase resumindo"
}`
  return parseJSON(await chamarIA(system, user))
}

// ── Helper ───────────────────────────────────────────────────────

function calcularTempo(dataAdmissao) {
  if (!dataAdmissao) return 'não informado'
  const meses = Math.floor((Date.now() - new Date(dataAdmissao)) / (1000 * 60 * 60 * 24 * 30))
  const anos = Math.floor(meses / 12)
  const m = meses % 12
  return anos > 0 ? `${anos} ano${anos > 1 ? 's' : ''} e ${m} meses` : `${meses} meses`
}