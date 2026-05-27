export interface FeatureUsage {
  calls: number
  input_tokens: number
  output_tokens: number
  cache_creation_tokens: number
  cache_read_tokens: number
}

// In-memory accumulator — resets on server restart, sufficient for a dev session
const _store: Record<string, FeatureUsage> = {}

export function recordUsage(
  feature: string,
  usage: {
    input_tokens: number
    output_tokens: number
    cache_creation_input_tokens?: number | null
    cache_read_input_tokens?: number | null
  }
) {
  if (!_store[feature]) {
    _store[feature] = { calls: 0, input_tokens: 0, output_tokens: 0, cache_creation_tokens: 0, cache_read_tokens: 0 }
  }
  _store[feature].calls++
  _store[feature].input_tokens += usage.input_tokens
  _store[feature].output_tokens += usage.output_tokens
  _store[feature].cache_creation_tokens += usage.cache_creation_input_tokens ?? 0
  _store[feature].cache_read_tokens += usage.cache_read_input_tokens ?? 0
}

export function getUsage(): Record<string, FeatureUsage> {
  return { ..._store }
}
