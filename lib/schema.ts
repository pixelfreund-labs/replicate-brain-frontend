export interface SchemaField {
  key: string
  title: string
  type: 'string' | 'integer' | 'number' | 'boolean'
  enum?: string[]
  default?: unknown
  minimum?: number
  maximum?: number
  description?: string
  isPrompt: boolean
}

// Keys that are not useful to expose in the UI
const IGNORED_KEYS = new Set([
  'image_input', 'allow_fallback_model', 'safety_filter_level',
  'seed', 'num_outputs', 'disable_safety_checker',
])

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseSchema(properties: Record<string, any>): SchemaField[] {
  return Object.entries(properties)
    .filter(([key]) => !IGNORED_KEYS.has(key))
    .map(([key, prop]) => ({
      key,
      title: prop.title ?? key,
      type: prop.type ?? 'string',
      enum: prop.enum ?? prop['x-enum'] ?? undefined,
      default: prop.default,
      minimum: prop.minimum,
      maximum: prop.maximum,
      description: prop.description,
      isPrompt: key === 'prompt',
    }))
    .sort((a, b) => {
      // prompt always first
      if (a.isPrompt) return -1
      if (b.isPrompt) return 1
      return 0
    })
}

export function buildInput(fields: SchemaField[], values: Record<string, unknown>): Record<string, unknown> {
  const input: Record<string, unknown> = {}
  for (const field of fields) {
    if (values[field.key] !== undefined) {
      input[field.key] = values[field.key]
    } else if (field.default !== undefined) {
      input[field.key] = field.default
    }
  }
  return input
}
