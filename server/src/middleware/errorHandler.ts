import { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof ZodError) {
    res.status(400).json({ error: 'Validation error', details: err.flatten().fieldErrors })
    return
  }

  if (err instanceof Error) {
    if (err.message.includes('UNIQUE constraint failed')) {
      res.status(409).json({ error: 'A record with that value already exists' })
      return
    }
    if (err.message.includes('FOREIGN KEY constraint failed')) {
      res.status(400).json({ error: 'Referenced record does not exist' })
      return
    }
    console.error(err)
    res.status(500).json({ error: err.message })
    return
  }

  res.status(500).json({ error: 'Internal server error' })
}
