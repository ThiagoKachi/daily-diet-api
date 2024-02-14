/* eslint-disable camelcase */
import { FastifyInstance } from 'fastify'
import { randomUUID } from 'node:crypto'
import { ZodError, z } from 'zod'
import { knex } from '../database'
import { checkSessionIdExists } from '../middlewares/check-session-id-exists'

interface CreateUserBody {
  success: boolean
  data: {
    name: string
    email: string
  }
  error: ZodError
}

export async function usersRoutes(app: FastifyInstance) {
  app.get(
    '/',
    {
      preHandler: [checkSessionIdExists],
    },
    async (request) => {
      const { sessionId } = request.cookies
      const users = await knex('users')
        .where('session_id', sessionId)
        .select('*')

      return users
    },
  )

  app.post('/', async (request, reply) => {
    const createUserBodySchema = z.object({
      name: z
        .string({
          required_error: 'Name is required',
          invalid_type_error: 'Name must be a string',
        })
        .min(1),
      email: z
        .string({
          required_error: 'E-mail is required',
          invalid_type_error: 'E-mail must be a string',
        })
        .email(),
    })

    const user = createUserBodySchema.safeParse(request.body) as CreateUserBody

    if (!user.success) {
      throw new Error(user.error.issues[0].message)
    }

    let sessionId = request.cookies.sessionId

    if (!sessionId) {
      sessionId = randomUUID()

      reply.cookie('sessionId', sessionId, {
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      })
    }

    await knex('users').insert({
      id: randomUUID(),
      name: user.data.name,
      email: user.data.email,
      session_id: sessionId,
    })

    return reply.status(201).send()
  })
}
