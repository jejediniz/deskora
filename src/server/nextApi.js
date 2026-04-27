const {
  authenticate,
  getTokenFromRequest,
  requireAdmin,
  requireTiOuAdmin
} = require('./http/auth')
const {
  authCookieOptions,
  clearAuthCookie,
  readAuthCookie,
  setAuthCookie
} = require('./http/cookies')
const {
  created,
  generateRequestId,
  handleError,
  json,
  noContent,
  run,
  success
} = require('./http/response')
const {
  getClientIp,
  queryObject,
  readBody,
  routeParams,
  validate
} = require('./http/request')

module.exports = {
  authCookieOptions,
  authenticate,
  clearAuthCookie,
  created,
  generateRequestId,
  getClientIp,
  getTokenFromRequest,
  handleError,
  json,
  noContent,
  queryObject,
  readAuthCookie,
  readBody,
  requireAdmin,
  requireTiOuAdmin,
  routeParams,
  run,
  setAuthCookie,
  success,
  validate
}
