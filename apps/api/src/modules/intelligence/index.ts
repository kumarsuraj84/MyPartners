import type { FastifyPluginAsync } from 'fastify'
import { intelligenceRoutes } from './intelligence.routes.js'
import { relationshipsIntelligenceRoutes } from './relationships.routes.js'
import { patternsIntelligenceRoutes } from './patterns.routes.js'

export const intelligenceModule: FastifyPluginAsync = async (fastify) => {
  await fastify.register(intelligenceRoutes)
  await fastify.register(relationshipsIntelligenceRoutes)
  await fastify.register(patternsIntelligenceRoutes)
}
