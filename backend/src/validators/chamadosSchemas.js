const Joi = require('joi')

const createChamadoSchema = Joi.object({
  titulo: Joi.string().min(3).max(200).required(),
  descricao: Joi.string().min(3).max(2000).required(),
  prioridade: Joi.string().valid('baixa', 'media', 'alta').optional(),
  tecnicoId: Joi.number().integer().min(1).optional(),
  setor: Joi.string().min(2).max(120).optional()
})

const updateChamadoSchema = Joi.object({
  titulo: Joi.string().min(3).max(200).optional(),
  descricao: Joi.string().min(3).max(2000).optional(),
  prioridade: Joi.string().valid('baixa', 'media', 'alta').optional(),
  status: Joi.string().valid('aberto', 'em_andamento', 'concluido').optional(),
  tecnicoId: Joi.number().integer().min(1).optional(),
  setor: Joi.string().min(2).max(120).optional()
})

const listChamadosQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(200).default(20),
  status: Joi.string().valid('aberto', 'em_andamento', 'concluido').optional(),
  prioridade: Joi.string().valid('baixa', 'media', 'alta').optional(),
  usuarioId: Joi.number().integer().min(1).optional()
})

module.exports = {
  createChamadoSchema,
  updateChamadoSchema,
  listChamadosQuerySchema
}
