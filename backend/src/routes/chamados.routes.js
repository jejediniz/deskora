const express = require('express')
const router = express.Router()

const chamadosController = require('../controllers/chamadosController')
const authMiddleware = require('../middlewares/authMiddleware')
const { validateBody, validateQuery } = require('../middlewares/validate')
const {
  createChamadoSchema,
  updateChamadoSchema,
  listChamadosQuerySchema,
  createChamadoInteracaoSchema
} = require('../validators/chamadosSchemas')

router.use(authMiddleware)

router.post('/', validateBody(createChamadoSchema), chamadosController.create)
router.get('/', validateQuery(listChamadosQuerySchema), chamadosController.list)
router.get('/:id/interacoes', chamadosController.listInteractions)
router.post('/:id/interacoes', validateBody(createChamadoInteracaoSchema), chamadosController.createInteraction)
router.get('/:id', chamadosController.findById)
router.put('/:id', validateBody(updateChamadoSchema), chamadosController.update)
router.delete('/:id', chamadosController.remove)

module.exports = router
