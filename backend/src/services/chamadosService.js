const AppError = require('../utils/AppError')
const logger = require('../utils/logger')
const chamadosRepository = require('../repositories/chamadosRepository')

const STATUS_VALIDOS = ['aberto', 'em_andamento', 'concluido']
const PRIORIDADES_VALIDAS = ['baixa', 'media', 'alta']

exports.create = async (dados, usuarioId) => {
  const { titulo, descricao, prioridade, setor } = dados

  if (!titulo || !descricao) {
    throw new AppError('Título e descrição são obrigatórios', 400)
  }

  const prioridadeFinal = PRIORIDADES_VALIDAS.includes(prioridade)
    ? prioridade
    : 'media'

  const statusInicial = 'aberto'

  const result = await chamadosRepository.criar(
    {
      titulo,
      descricao,
      prioridade: prioridadeFinal,
      status: statusInicial,
      setor,
      tecnicoId: dados.tecnicoId
    },
    usuarioId
  )

  const chamado = await chamadosRepository.buscarPorIdQualquer(result.rows[0].id)

  logger.audit('chamado.criado', {
    chamadoId: chamado.id,
    usuarioId
  })

  return chamado
}

exports.list = async (usuarioId, { listarTodos = false, filtros = {} } = {}) => {
  const page = Number(filtros.page || 1)
  const limit = Number(filtros.limit || 20)

  if (!listarTodos && filtros.usuarioId && Number(filtros.usuarioId) !== Number(usuarioId)) {
    throw new AppError('Permissão negada', 403)
  }

  const queryFilters = {
    status: filtros.status,
    prioridade: filtros.prioridade,
    page,
    limit
  }

  if (listarTodos) {
    if (filtros.usuarioId) {
      queryFilters.usuarioId = filtros.usuarioId
    }
  } else {
    queryFilters.usuarioId = usuarioId
  }

  const { items, total } = await chamadosRepository.listWithFilters(queryFilters)

  return {
    items,
    meta: {
      page,
      limit,
      total,
      totalPages: limit > 0 ? Math.ceil(total / limit) : 1
    }
  }
}

exports.findById = async (id, usuarioId, { buscarQualquer = false } = {}) => {
  return buscarQualquer
    ? await chamadosRepository.buscarPorIdQualquer(id)
    : await chamadosRepository.buscarPorId(id, usuarioId)
}

exports.update = async (
  id,
  dados,
  usuarioId,
  { atualizarQualquer = false, podeAtribuir = false } = {}
) => {
  const { status, prioridade } = dados

  if (status && !STATUS_VALIDOS.includes(status)) {
    throw new AppError('Status inválido', 400)
  }

  if (prioridade && !PRIORIDADES_VALIDAS.includes(prioridade)) {
    throw new AppError('Prioridade inválida', 400)
  }

  if (dados.tecnicoId !== undefined && !podeAtribuir) {
    throw new AppError('Atribuição de técnico restrita a TI ou administradores', 403)
  }

  const result = atualizarQualquer
    ? await chamadosRepository.atualizarQualquer(id, dados)
    : await chamadosRepository.atualizar(id, dados, usuarioId)

  if (!result.rows[0]) {
    return null
  }

  const chamadoAtualizado = await chamadosRepository.buscarPorIdQualquer(id)

  if (chamadoAtualizado) {
    logger.audit('chamado.atualizado', {
      chamadoId: chamadoAtualizado.id,
      usuarioId
    })

    if (chamadoAtualizado.status === 'concluido') {
      logger.audit('chamado.concluido', {
        chamadoId: chamadoAtualizado.id,
        usuarioId
      })
    }
  }

  return chamadoAtualizado
}

exports.remove = async (id, usuarioId, { deletarQualquer = false } = {}) => {
  const result = deletarQualquer
    ? await chamadosRepository.deletarQualquer(id)
    : await chamadosRepository.deletar(id, usuarioId)

  if (result.rowCount > 0) {
    logger.audit('chamado.removido', {
      chamadoId: id,
      usuarioId
    })
  }

  return result.rowCount > 0
}
