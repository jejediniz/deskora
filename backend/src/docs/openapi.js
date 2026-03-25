const spec = {
  openapi: '3.0.3',
  info: {
    title: 'Deskora API',
    version: '1.0.0',
    description: 'Documentação base da API de autenticação, usuários e chamados do Deskora.'
  },
  servers: [{ url: '/' }],
  paths: {
    '/health': {
      get: {
        summary: 'Health check',
        responses: {
          200: {
            description: 'Aplicação saudável'
          }
        }
      }
    },
    '/auth/login': {
      post: {
        summary: 'Autenticar usuário',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'senha'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  senha: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Login realizado com sucesso' }
        }
      }
    },
    '/auth/register': {
      post: {
        summary: 'Registrar usuário via admin',
        security: [{ bearerAuth: [] }],
        responses: {
          201: { description: 'Usuário registrado com sucesso' }
        }
      }
    },
    '/users': {
      get: {
        summary: 'Listar usuários',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Lista de usuários' }
        }
      },
      post: {
        summary: 'Criar usuário',
        security: [{ bearerAuth: [] }],
        responses: {
          201: { description: 'Usuário criado' }
        }
      }
    },
    '/users/tecnicos': {
      get: {
        summary: 'Listar técnicos',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Lista de técnicos' }
        }
      }
    },
    '/users/{id}': {
      get: {
        summary: 'Buscar usuário por ID',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' }
          }
        ],
        responses: {
          200: { description: 'Usuário encontrado' },
          404: { description: 'Usuário não encontrado' }
        }
      },
      put: {
        summary: 'Atualizar usuário',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Usuário atualizado' }
        }
      },
      delete: {
        summary: 'Excluir usuário',
        security: [{ bearerAuth: [] }],
        responses: {
          204: { description: 'Usuário removido' }
        }
      }
    },
    '/chamados': {
      get: {
        summary: 'Listar chamados',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer' } },
          { name: 'limit', in: 'query', schema: { type: 'integer' } },
          { name: 'status', in: 'query', schema: { type: 'string' } },
          { name: 'prioridade', in: 'query', schema: { type: 'string' } },
          { name: 'usuarioId', in: 'query', schema: { type: 'integer' } }
        ],
        responses: {
          200: { description: 'Lista de chamados paginada' }
        }
      },
      post: {
        summary: 'Criar chamado',
        security: [{ bearerAuth: [] }],
        responses: {
          201: { description: 'Chamado criado' }
        }
      }
    },
    '/chamados/{id}': {
      get: {
        summary: 'Buscar chamado por ID',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' }
          }
        ],
        responses: {
          200: { description: 'Chamado encontrado' },
          404: { description: 'Chamado não encontrado' }
        }
      },
      put: {
        summary: 'Atualizar chamado',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Chamado atualizado' }
        }
      },
      delete: {
        summary: 'Excluir chamado',
        security: [{ bearerAuth: [] }],
        responses: {
          204: { description: 'Chamado removido' }
        }
      }
    },
    '/chamados/{id}/interacoes': {
      get: {
        summary: 'Listar interações do chamado',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' }
          }
        ],
        responses: {
          200: { description: 'Interações listadas com sucesso' },
          404: { description: 'Chamado não encontrado' }
        }
      },
      post: {
        summary: 'Criar interação no chamado',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' }
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['mensagem'],
                properties: {
                  mensagem: { type: 'string' },
                  tipo: {
                    type: 'string',
                    enum: ['publica', 'interna']
                  }
                }
              }
            }
          }
        },
        responses: {
          201: { description: 'Interação criada com sucesso' },
          403: { description: 'Operação não permitida' },
          404: { description: 'Chamado não encontrado' }
        }
      }
    }
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    }
  }
}

function renderDocsHtml(jsonUrl) {
  return `<!DOCTYPE html>
  <html lang="pt-BR">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Deskora API Docs</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; background: #f8fafc; color: #111827; }
        main { max-width: 960px; margin: 0 auto; padding: 40px 20px; }
        h1 { margin-bottom: 8px; }
        p { color: #4b5563; line-height: 1.6; }
        pre { background: #0f172a; color: #e2e8f0; padding: 20px; border-radius: 16px; overflow: auto; }
        a { color: #2563eb; }
      </style>
    </head>
    <body>
      <main>
        <h1>Deskora API</h1>
        <p>Documentação OpenAPI simplificada. Para integração automática, use o arquivo JSON abaixo.</p>
        <p><a href="${jsonUrl}">${jsonUrl}</a></p>
        <pre id="spec">Carregando especificação...</pre>
      </main>
      <script>
        fetch('${jsonUrl}')
          .then((response) => response.json())
          .then((data) => {
            document.getElementById('spec').textContent = JSON.stringify(data, null, 2)
          })
          .catch(() => {
            document.getElementById('spec').textContent = 'Não foi possível carregar a especificação.'
          })
      </script>
    </body>
  </html>`
}

module.exports = {
  spec,
  renderDocsHtml
}
