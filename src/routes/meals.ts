import { FastifyInstance } from 'fastify'
import { randomUUID } from 'node:crypto'
import { ZodError, z } from 'zod'
import { knex } from '../database'
import { checkSessionIdExists } from '../middlewares/check-session-id-exists'

interface createMealsBody {
  data: {
    name: string
    description: string
    is_on_diet: boolean
  }
  success: boolean
  error: ZodError
}

export async function mealsRoutes(app: FastifyInstance) {
  app.get(
    '/',
    {
      preHandler: [checkSessionIdExists],
    },
    async (request) => {
      const { sessionId } = request.cookies

      const [{ id }] = await knex('users').where('session_id', sessionId)

      const response = await knex('meals').where('user_id', id).select('*')

      return response
    },
  )

  app.get(
    '/:id',
    {
      preHandler: [checkSessionIdExists],
    },
    async (request) => {
      const createMealParamSchema = z.object({
        id: z.string(),
      })

      const { sessionId } = request.cookies

      const [{ id }] = await knex('users').where('session_id', sessionId)

      const { id: mealId } = createMealParamSchema.parse(request.params)

      const response = await knex('meals')
        .where({
          user_id: id,
          id: mealId,
        })
        .select('*')

      return response[0]
    },
  )

  app.delete(
    '/:id',
    {
      preHandler: [checkSessionIdExists],
    },
    async (request) => {
      const createMealParamSchema = z.object({
        id: z.string(),
      })

      const { sessionId } = request.cookies

      const [{ id }] = await knex('users').where('session_id', sessionId)

      const { id: mealId } = createMealParamSchema.parse(request.params)

      const response = await knex('meals')
        .where({
          user_id: id,
          id: mealId,
        })
        .delete('*')

      return response[0]
    },
  )

  app.post(
    '/',
    {
      preHandler: [checkSessionIdExists],
    },
    async (request, reply) => {
      const { sessionId } = request.cookies

      const createMealBodySchema = z.object({
        name: z
          .string({
            required_error: 'Name is required',
            invalid_type_error: 'Name must be a string',
          })
          .min(1),
        description: z.string({
          required_error: 'Description is required',
          invalid_type_error: 'Description must be a string',
        }),
        is_on_diet: z.boolean({
          required_error: 'Is on diet is required',
          invalid_type_error: 'Is on diet must be a boolean',
        }),
      })

      const meal = createMealBodySchema.safeParse(
        request.body,
      ) as createMealsBody

      if (!meal.success) {
        throw new Error(meal.error.issues[0].message)
      }

      const [{ id }] = await knex('users').where('session_id', sessionId)

      await knex('meals').insert({
        id: randomUUID(),
        user_id: id,
        name: meal.data.name,
        description: meal.data.description,
        is_on_diet: meal.data.is_on_diet,
        date: new Date().toISOString(),
      })

      return reply.status(201).send()
    },
  )
}
