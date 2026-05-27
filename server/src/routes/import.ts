import { Router } from 'express'
import { z } from 'zod'
import Anthropic, { toFile } from '@anthropic-ai/sdk'
import rateLimit from 'express-rate-limit'

export const importRouter = Router()

importRouter.use(rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests — please try again later.' },
}))

const client = new Anthropic()

const BodySchema = z.object({
  csv: z.string().min(1).max(100_000),
  month: z.string().regex(/^\d{4}-\d{2}$/, 'month must be YYYY-MM'),
})

// tool_choice forces a typed extraction — same pattern as Phase 7
const EXTRACT_TOOL: Anthropic.Tool = {
  name: 'extract_transactions',
  description: 'Extract every transaction from the uploaded bank statement into structured data.',
  input_schema: {
    type: 'object' as const,
    properties: {
      transactions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            date: { type: 'string', description: 'Date in YYYY-MM-DD format' },
            description: { type: 'string' },
            amount: { type: 'number', description: 'Always a positive number' },
            type: { type: 'string', enum: ['income', 'expense'] },
            category: {
              type: 'string',
              description: 'Best-fit category: Food & Groceries, Transport, Entertainment, Utilities, Health, or Other',
            },
          },
          required: ['date', 'description', 'amount', 'type', 'category'],
        },
      },
      notes: { type: 'string', description: 'Parsing notes — ambiguities, skipped rows, currency assumptions' },
    },
    required: ['transactions', 'notes'],
  },
}

importRouter.post('/preview', async (req, res, next) => {
  try {
    const { csv, month } = BodySchema.parse(req.body)

    // 1. Upload the CSV to the Anthropic Files API — stored server-side, referenced by ID
    const buffer = Buffer.from(csv, 'utf-8')
    const uploaded = await client.beta.files.upload({
      file: await toFile(buffer, 'statement.csv', { type: 'text/plain' }),
    })

    let extracted
    try {
      // 2. Reference the file by ID — no re-uploading needed if we called this twice
      const response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        tools: [EXTRACT_TOOL],
        tool_choice: { type: 'tool', name: 'extract_transactions' },
        messages: [{
          role: 'user',
          content: [
            // file_id source is a newer beta — cast through unknown until SDK types catch up
            {
              type: 'document',
              source: { type: 'file', file_id: uploaded.id },
            } as unknown as Anthropic.DocumentBlockParam,
            {
              type: 'text',
              text: `Parse this bank statement for ${month}. Use "income" for credits/salary/transfers in, "expense" for debits/payments. Match categories to the available ones. Dates must be in YYYY-MM-DD format.`,
            },
          ],
        }],
      })

      const block = response.content.find(b => b.type === 'tool_use')
      if (!block || block.type !== 'tool_use') throw new Error('No extraction block returned')
      extracted = block.input as Record<string, unknown>
    } finally {
      // 3. Clean up — delete the file now that we have the result
      await client.beta.files.delete(uploaded.id).catch(() => undefined)
    }

    res.json({ file_id: uploaded.id, ...extracted })
  } catch (err) {
    next(err)
  }
})
