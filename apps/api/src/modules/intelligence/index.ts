import type { FastifyPluginAsync } from 'fastify'

// Sub-route plugins are imported once the route files are cherry-picked in.
// import { intelligenceRoutes } from './intelligence.routes.js'
// import { relationshipsIntelligenceRoutes } from './relationships.routes.js'
// import { patternsIntelligenceRoutes } from './patterns.routes.js'

export const intelligenceModule: FastifyPluginAsync = async (fastify) => {
  // Routes registered here after cherry-picks merge all three files:
  //   intelligenceRoutes   → preferences endpoint
  //   relationshipsIntelligenceRoutes → relationships endpoint
  //   patternsIntelligenceRoutes      → patterns endpoint
  //
  // await fastify.register(intelligenceRoutes)
  // await fastify.register(relationshipsIntelligenceRoutes)
  // await fastify.register(patternsIntelligenceRoutes)
}
