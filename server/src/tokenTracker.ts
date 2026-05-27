export interface FeatureUsage {
  calls: number
  input_tokens: number
  output_tokens: number
}

// In-memory accumulator — resets on server restart, sufficient for a dev session
const _store: Record<string, FeatureUsage> = {}

export function recordUsage(feature: string, input: number, output: number) {
  if (!_store[feature]) _store[feature] = { calls: 0, input_tokens: 0, output_tokens: 0 }
  _store[feature].calls++
  _store[feature].input_tokens += input
  _store[feature].output_tokens += output
}

export function getUsage(): Record<string, FeatureUsage> {
  return { ..._store }
}
