import { Router } from 'express'
import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'
import { getUsage } from '../tokenTracker'

export const usageRouter = Router()

const client = new Anthropic()

// claude-sonnet-4-6 pricing (per token)
const INPUT_COST_PER_TOKEN = 3.00 / 1_000_000
const OUTPUT_COST_PER_TOKEN = 15.00 / 1_000_000
const CACHE_READ_COST_PER_TOKEN = 0.30 / 1_000_000

// GET /api/usage — accumulated stats from this server session
usageRouter.get('/', (_req, res) => {
  const raw = getUsage()
  const features = Object.entries(raw)
    .map(([feature, u]) => ({
      feature,
      calls: u.calls,
      input_tokens: u.input_tokens,
      output_tokens: u.output_tokens,
      cache_creation_tokens: u.cache_creation_tokens,
      cache_read_tokens: u.cache_read_tokens,
      cost: +(u.input_tokens * INPUT_COST_PER_TOKEN + u.output_tokens * OUTPUT_COST_PER_TOKEN).toFixed(6),
      // Savings vs no-cache baseline: read tokens cost 10% of normal input price
      cache_savings: +(u.cache_read_tokens * (INPUT_COST_PER_TOKEN - CACHE_READ_COST_PER_TOKEN)).toFixed(6),
    }))
    .sort((a, b) => b.cost - a.cost)

  const totals = features.reduce(
    (acc, f) => ({
      calls: acc.calls + f.calls,
      input_tokens: acc.input_tokens + f.input_tokens,
      output_tokens: acc.output_tokens + f.output_tokens,
      cache_creation_tokens: acc.cache_creation_tokens + f.cache_creation_tokens,
      cache_read_tokens: acc.cache_read_tokens + f.cache_read_tokens,
      cost: +(acc.cost + f.cost).toFixed(6),
      cache_savings: +(acc.cache_savings + f.cache_savings).toFixed(6),
    }),
    { calls: 0, input_tokens: 0, output_tokens: 0, cache_creation_tokens: 0, cache_read_tokens: 0, cost: 0, cache_savings: 0 }
  )

  res.json({ features, totals, pricing: { input_per_million: 3.00, output_per_million: 15.00 } })
})

const CountSchema = z.object({
  prompt: z.string().min(1).max(10_000),
})

// POST /api/usage/count — count tokens for a prompt without spending any credits
usageRouter.post('/count', async (req, res, next) => {
  try {
    const { prompt } = CountSchema.parse(req.body)
    const result = await client.messages.countTokens({
      model: 'claude-sonnet-4-6',
      messages: [{ role: 'user', content: prompt }],
    })
    res.json({
      input_tokens: result.input_tokens,
      estimated_cost: +(result.input_tokens * INPUT_COST_PER_TOKEN).toFixed(6),
    })
  } catch (err) {
    next(err)
  }
})
