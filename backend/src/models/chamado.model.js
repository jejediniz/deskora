const pool = require('../config/database')

const ChamadoModel = {
  criar: (dados, usuarioId) => {
    const query = `
      INSERT INTO chamados (titulo, descricao, status, prioridade, usuario_id, tecnico_id, setor)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `
    return pool.query(query, [
      dados.titulo,
      dados.descricao,
      dados.status,
      dados.prioridade,
      usuarioId,
      dados.tecnicoId ?? null,
      dados.setor ?? null
    ])
  },

  listarPorUsuario: (usuarioId) => {
    const query = `
      SELECT *
      FROM chamados
      WHERE usuario_id = $1
      ORDER BY id DESC;
    `
    return pool.query(query, [usuarioId])
  },

  listarTodos: () => {
    const query = `
      SELECT *
      FROM chamados
      ORDER BY id DESC;
    `
    return pool.query(query)
  },

  buscarPorId: (id, usuarioId) => {
    const query = `
      SELECT *
      FROM chamados
      WHERE id = $1 AND usuario_id = $2;
    `
    return pool.query(query, [id, usuarioId])
  },

  buscarPorIdQualquer: (id) => {
    const query = `
      SELECT *
      FROM chamados
      WHERE id = $1;
    `
    return pool.query(query, [id])
  },

  atualizar: (id, dados, usuarioId) => {
    const query = `
      UPDATE chamados
      SET
        titulo = COALESCE($1, titulo),
        descricao = COALESCE($2, descricao),
        status = COALESCE($3, status),
        prioridade = COALESCE($4, prioridade),
        tecnico_id = COALESCE($5, tecnico_id),
        setor = COALESCE($6, setor),
        updated_at = NOW()
      WHERE id = $7 AND usuario_id = $8
      RETURNING *;
    `
    return pool.query(query, [
      dados.titulo,
      dados.descricao,
      dados.status,
      dados.prioridade,
      dados.tecnicoId,
      dados.setor,
      id,
      usuarioId
    ])
  },

  atualizarQualquer: (id, dados) => {
    const query = `
      UPDATE chamados
      SET
        titulo = COALESCE($1, titulo),
        descricao = COALESCE($2, descricao),
        status = COALESCE($3, status),
        prioridade = COALESCE($4, prioridade),
        tecnico_id = COALESCE($5, tecnico_id),
        setor = COALESCE($6, setor),
        updated_at = NOW()
      WHERE id = $7
      RETURNING *;
    `
    return pool.query(query, [
      dados.titulo,
      dados.descricao,
      dados.status,
      dados.prioridade,
      dados.tecnicoId,
      dados.setor,
      id
    ])
  },

  tocarAtualizacao: (id) => {
    const query = `
      UPDATE chamados
      SET updated_at = NOW()
      WHERE id = $1
      RETURNING id;
    `
    return pool.query(query, [id])
  },

  deletar: (id, usuarioId) => {
    const query = `
      DELETE FROM chamados
      WHERE id = $1 AND usuario_id = $2
      RETURNING id;
    `
    return pool.query(query, [id, usuarioId])
  },

  deletarQualquer: (id) => {
    const query = `
      DELETE FROM chamados
      WHERE id = $1
      RETURNING id;
    `
    return pool.query(query, [id])
  }
}

module.exports = ChamadoModel
