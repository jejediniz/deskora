const pool = require('../config/database')

let ensureTablePromise = null

function ensureTable() {
  if (!ensureTablePromise) {
    ensureTablePromise = pool.query(`
      CREATE TABLE IF NOT EXISTS chamado_interacoes (
        id SERIAL PRIMARY KEY,
        chamado_id INTEGER NOT NULL REFERENCES chamados(id) ON DELETE CASCADE,
        autor_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        mensagem TEXT NOT NULL,
        tipo VARCHAR(20) NOT NULL DEFAULT 'publica',
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_chamado_interacoes_chamado_id
        ON chamado_interacoes (chamado_id, created_at ASC);
    `)
  }

  return ensureTablePromise
}

const ChamadoInteracaoModel = {
  ensureTable,

  async criar({ chamadoId, autorId, mensagem, tipo = 'publica' }) {
    await ensureTable()

    const query = `
      INSERT INTO chamado_interacoes (chamado_id, autor_id, mensagem, tipo)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `

    return pool.query(query, [chamadoId, autorId, mensagem, tipo])
  },

  async listarPorChamado(chamadoId) {
    await ensureTable()

    const query = `
      SELECT *
      FROM chamado_interacoes
      WHERE chamado_id = $1
      ORDER BY created_at ASC, id ASC;
    `

    return pool.query(query, [chamadoId])
  }
}

module.exports = ChamadoInteracaoModel
