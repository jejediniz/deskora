const pool = require('../config/database')
const ChamadoModel = require('../models/chamado.model')

const BASE_SELECT = `
  SELECT
    c.*,
    solicitante.nome AS solicitante_nome,
    solicitante.email AS solicitante_email,
    solicitante.tipo AS solicitante_tipo,
    tecnico.nome AS tecnico_nome,
    tecnico.email AS tecnico_email
  FROM chamados c
  JOIN usuarios solicitante ON solicitante.id = c.usuario_id
  LEFT JOIN usuarios tecnico ON tecnico.id = c.tecnico_id
`

function mapChamado(row) {
  const {
    solicitante_nome,
    solicitante_email,
    solicitante_tipo,
    tecnico_nome,
    tecnico_email,
    ...rest
  } = row

  return {
    ...rest,
    solicitante: {
      id: rest.usuario_id,
      nome: solicitante_nome,
      email: solicitante_email,
      tipo: solicitante_tipo
    },
    tecnico: rest.tecnico_id
      ? {
          id: rest.tecnico_id,
          nome: tecnico_nome,
          email: tecnico_email
        }
      : null
  }
}

function buildWhereClause(filters, values) {
  const conditions = []

  if (filters.status) {
    values.push(filters.status)
    conditions.push(`c.status = $${values.length}`)
  }

  if (filters.prioridade) {
    values.push(filters.prioridade)
    conditions.push(`c.prioridade = $${values.length}`)
  }

  if (filters.usuarioId) {
    values.push(filters.usuarioId)
    conditions.push(`c.usuario_id = $${values.length}`)
  }

  return conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
}

async function listWithFilters({ status, prioridade, usuarioId, page, limit }) {
  const values = []
  const whereClause = buildWhereClause({ status, prioridade, usuarioId }, values)

  const countQuery = `
    SELECT COUNT(*)::int AS total
    FROM chamados c
    ${whereClause}
  `

  const listQuery = `
    ${BASE_SELECT}
    ${whereClause}
    ORDER BY c.id DESC
    LIMIT $${values.length + 1}
    OFFSET $${values.length + 2}
  `

  const offset = (page - 1) * limit
  const listValues = [...values, limit, offset]

  const [countResult, listResult] = await Promise.all([
    pool.query(countQuery, values),
    pool.query(listQuery, listValues)
  ])

  const total = countResult.rows[0]?.total || 0
  const items = listResult.rows.map(mapChamado)

  return {
    items,
    total
  }
}

async function buscarPorId(id, usuarioId) {
  const query = `
    ${BASE_SELECT}
    WHERE c.id = $1 AND c.usuario_id = $2
  `

  const { rows } = await pool.query(query, [id, usuarioId])
  return rows[0] ? mapChamado(rows[0]) : null
}

async function buscarPorIdQualquer(id) {
  const query = `
    ${BASE_SELECT}
    WHERE c.id = $1
  `

  const { rows } = await pool.query(query, [id])
  return rows[0] ? mapChamado(rows[0]) : null
}

module.exports = {
  criar: ChamadoModel.criar,
  listarPorUsuario: ChamadoModel.listarPorUsuario,
  listarTodos: ChamadoModel.listarTodos,
  buscarPorId,
  buscarPorIdQualquer,
  atualizar: ChamadoModel.atualizar,
  atualizarQualquer: ChamadoModel.atualizarQualquer,
  tocarAtualizacao: ChamadoModel.tocarAtualizacao,
  deletar: ChamadoModel.deletar,
  deletarQualquer: ChamadoModel.deletarQualquer,
  listWithFilters
}
