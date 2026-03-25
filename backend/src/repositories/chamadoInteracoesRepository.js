const pool = require('../config/database')
const ChamadoInteracaoModel = require('../models/chamadoInteracao.model')

function mapInteracao(row) {
  const {
    autor_nome,
    autor_email,
    autor_tipo,
    autor_admin,
    ...rest
  } = row

  return {
    ...rest,
    autor: {
      id: rest.autor_id,
      nome: autor_nome,
      email: autor_email,
      tipo: autor_tipo,
      admin: autor_admin
    }
  }
}

async function listarPorChamado(chamadoId, { incluirInternas = false } = {}) {
  await ChamadoInteracaoModel.ensureTable()

  const values = [chamadoId]
  let filtroTipo = ''

  if (!incluirInternas) {
    values.push('interna')
    filtroTipo = `AND ci.tipo <> $${values.length}`
  }

  const query = `
    SELECT
      ci.*,
      autor.nome AS autor_nome,
      autor.email AS autor_email,
      autor.tipo AS autor_tipo,
      autor.admin AS autor_admin
    FROM chamado_interacoes ci
    JOIN usuarios autor ON autor.id = ci.autor_id
    WHERE ci.chamado_id = $1
    ${filtroTipo}
    ORDER BY ci.created_at ASC, ci.id ASC
  `

  const { rows } = await pool.query(query, values)
  return rows.map(mapInteracao)
}

async function criar(dados) {
  const result = await ChamadoInteracaoModel.criar(dados)
  const interacaoId = result.rows[0]?.id

  if (!interacaoId) {
    return null
  }

  const query = `
    SELECT
      ci.*,
      autor.nome AS autor_nome,
      autor.email AS autor_email,
      autor.tipo AS autor_tipo,
      autor.admin AS autor_admin
    FROM chamado_interacoes ci
    JOIN usuarios autor ON autor.id = ci.autor_id
    WHERE ci.id = $1
  `

  const { rows } = await pool.query(query, [interacaoId])
  return rows[0] ? mapInteracao(rows[0]) : null
}

module.exports = {
  criar,
  listarPorChamado
}
