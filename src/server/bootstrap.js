const { validateEnv } = require('./config/env')
const logger = require('./utils/logger')

let booted = false

function bootstrap() {
  if (booted) return
  booted = true

  validateEnv()

  logger.info('app.boot', {
    env: process.env.NODE_ENV,
    nodeVersion: process.version,
    pid: process.pid
  })

  const onShutdown = (signal) => {
    logger.info('app.shutdown', { signal })
    process.exit(0)
  }

  process.once('SIGINT', () => onShutdown('SIGINT'))
  process.once('SIGTERM', () => onShutdown('SIGTERM'))

  process.on('unhandledRejection', (reason) => {
    logger.error('unhandled_rejection', {
      message: reason?.message ?? String(reason),
      stack: reason?.stack
    })
  })

  process.on('uncaughtException', (error) => {
    logger.error('uncaught_exception', {
      message: error?.message,
      stack: error?.stack
    })
  })
}

bootstrap()

module.exports = { bootstrap }
