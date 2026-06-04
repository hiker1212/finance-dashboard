import { Router, type Request, type Response, type NextFunction } from 'express'
import multer, { MulterError } from 'multer'
import Anthropic from '@anthropic-ai/sdk'
import rateLimit from 'express-rate-limit'
import { recordUsage } from '../tokenTracker'

export const receiptRouter = Router()

receiptRouter.use(rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests — please try again later.' },
}))

const client = new Anthropic()

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp'])

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_TYPES.has(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Unsupported image type. Use JPEG, PNG, GIF, or WEBP.'))
    }
  },
})

const RECEIPT_TOOL: Anthropic.Tool = {
  name: 'extract_receipt',
  description: 'Extract structured transaction details from a receipt image.',
  input_schema: {
    type: 'object' as const,
    required: ['amount', 'suggested_category'],
    properties: {
      merchant:            { type: 'string', description: 'Merchant or vendor name (empty string if unreadable)' },
      amount:              { type: 'number', description: 'Total amount charged as a positive number' },
      date:                { type: 'string', description: 'Date of transaction in YYYY-MM-DD format, or empty string if not found' },
      suggested_category:  {
        type: 'string',
        enum: ['Food & Groceries', 'Transport', 'Entertainment', 'Utilities', 'Health', 'Other'],
        description: 'Best-matching spending category',
      },
    },
  },
}

receiptRouter.post('/', upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No image file provided. Send a JPEG/PNG/GIF/WEBP in the "image" field.' })
      return
    }

    const mediaType = req.file.mimetype as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
    const base64 = req.file.buffer.toString('base64')

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 256,
      tools: [RECEIPT_TOOL],
      tool_choice: { type: 'tool', name: 'extract_receipt' },
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: base64 },
          },
          {
            type: 'text',
            text: 'Extract the receipt details from this image.',
          },
        ],
      }],
    })

    recordUsage('receipt', response.usage)

    const block = response.content.find(b => b.type === 'tool_use')
    if (!block || block.type !== 'tool_use') {
      res.status(502).json({ error: 'Could not extract receipt data.' })
      return
    }

    res.json(block.input)
  } catch (err) {
    next(err)
  }
})

// multer file-type errors arrive as regular errors — map to 400
receiptRouter.use((err: Error, _req: Request, res: Response, next: NextFunction) => {
  if (err instanceof MulterError || err.message.includes('Unsupported image type')) {
    const msg = err instanceof MulterError && err.code === 'LIMIT_FILE_SIZE'
      ? 'Image must be under 5 MB.'
      : err instanceof MulterError && err.code === 'LIMIT_UNEXPECTED_FILE'
        ? 'Unexpected field — send the image in the "image" field.'
        : err.message
    res.status(400).json({ error: msg })
    return
  }
  next(err)
})
