const express = require('express')
const cors = require('cors')

const authRoutes = require('./routes/authRoutes')
const userRoutes = require('./routes/userRoutes')
const chamadosRoutes = require('./routes/chamados.routes')
const { spec, renderDocsHtml } = require('./docs/openapi')
const errorHandler = require('./middlewares/errorHandler')
const notFound = require('./middlewares/notFound')
const { getEnv } = require('./config/env')

const app = express()

const { corsOrigin } = getEnv()

const corsOptions = {
  origin: corsOrigin ? corsOrigin.split(',').map((origin) => origin.trim()) : '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}

app.use(cors(corsOptions))
app.use(express.json({ limit: '1mb' }))

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' })
})

app.get('/docs/openapi.json', (req, res) => {
  res.status(200).json(spec)
})

app.get('/docs', (req, res) => {
  res.status(200).send(renderDocsHtml('/docs/openapi.json'))
})

// Rotas
app.use('/auth', authRoutes)
app.use('/users', userRoutes)
app.use('/chamados', chamadosRoutes)

app.use(notFound)
app.use(errorHandler)

module.exports = app
