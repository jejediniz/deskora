const chamadosService = require('../services/chamadosService')
const chamadoInteracoesService = require('../services/chamadoInteracoesService')
const asyncHandler = require('../utils/asyncHandler')
const AppError = require('../utils/AppError')
const { sendSuccess, sendCreated, sendNoContent } = require('../utils/response')

exports.create = asyncHandler(async (req, res) => {
  const usuarioId = req.user.id
  const chamado = await chamadosService.create(req.body, usuarioId)
  return sendCreated(res, chamado, 'Chamado criado com sucesso')
})

exports.list = asyncHandler(async (req, res) => {
  const usuarioId = req.user.id
  const listarTodos = req.user.tipo === 'ti' || req.user.admin === true
  const { items, meta } = await chamadosService.list(usuarioId, {
    listarTodos,
    filtros: req.query
  })
  return sendSuccess(res, items, 'Chamados listados com sucesso', meta)
})

exports.findById = asyncHandler(async (req, res) => {
  const usuarioId = req.user.id
  const buscarQualquer = req.user.tipo === 'ti' || req.user.admin === true
  const chamado = await chamadosService.findById(req.params.id, usuarioId, { buscarQualquer })

  if (!chamado) {
    throw new AppError('Chamado não encontrado', 404)
  }

  return sendSuccess(res, chamado, 'Chamado encontrado')
})

exports.listInteractions = asyncHandler(async (req, res) => {
  const interacoes = await chamadoInteracoesService.list(req.params.id, req.user)
  return sendSuccess(res, interacoes, 'Interações listadas com sucesso')
})

exports.createInteraction = asyncHandler(async (req, res) => {
  const interacao = await chamadoInteracoesService.create(req.params.id, req.body, req.user)
  return sendCreated(res, interacao, 'Interação criada com sucesso')
})

exports.update = asyncHandler(async (req, res) => {
  const usuarioId = req.user.id
  const atualizarQualquer = req.user.tipo === 'ti'
  const podeAtribuir = req.user.tipo === 'ti' || req.user.admin === true
  const chamado = await chamadosService.update(
    req.params.id,
    req.body,
    usuarioId,
    { atualizarQualquer, podeAtribuir }
  )

  if (!chamado) {
    throw new AppError('Chamado não encontrado', 404)
  }

  return sendSuccess(res, chamado, 'Chamado atualizado com sucesso')
})

exports.remove = asyncHandler(async (req, res) => {
  const usuarioId = req.user.id
  const deletarQualquer = req.user.admin === true
  const removido = await chamadosService.remove(req.params.id, usuarioId, { deletarQualquer })

  if (!removido) {
    throw new AppError('Chamado não encontrado', 404)
  }

  return sendNoContent(res)
})
