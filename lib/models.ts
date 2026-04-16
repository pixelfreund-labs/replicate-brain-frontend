import type { SchemaField } from '@/lib/schema'

export interface ModelDef {
  id: string
  label: string
  description: string
  cover_image_url?: string | null
  endpoint?: string
  schema?: SchemaField[]
}

// Built-in default schema for Nano-Banana-PRO
const NANO_BANANA_SCHEMA: SchemaField[] = [
  { key: 'prompt',       title: 'Prompt',       type: 'string',  isPrompt: true },
  { key: 'aspect_ratio', title: 'Aspect Ratio',  type: 'string',  enum: ['1:1','16:9','9:16','4:3','3:4','21:9'], default: '16:9', isPrompt: false },
  { key: 'output_format',title: 'Format',        type: 'string',  enum: ['jpg','png','webp'],                     default: 'jpg',  isPrompt: false },
  { key: 'output_quality',title: 'Quality',      type: 'integer', minimum: 50, maximum: 100,                      default: 80,     isPrompt: false },
]

export const BUILTIN_MODELS: ModelDef[] = [
  {
    id: 'nano-banana-pro',
    label: 'Nano-Banana-PRO',
    description: 'Google via Replicate – Editorial illustration',
    endpoint: 'https://api.replicate.com/v1/models/google/nano-banana-pro/predictions',
    schema: NANO_BANANA_SCHEMA,
  },
]

export const CUSTOM_MODELS_KEY = 'replicate-custom-models'

export function getDefaultValues(schema: SchemaField[]): Record<string, unknown> {
  const vals: Record<string, unknown> = {}
  for (const f of schema) {
    if (f.default !== undefined) vals[f.key] = f.default
  }
  return vals
}

export interface HistoryEntry {
  id: string
  prompt: string
  imageUrl: string
  model: string
  params: Record<string, unknown>
  createdAt: string
  duration?: number
}

export interface LogEntry {
  id: string
  prompt: string
  imageUrl: string
  model: string
  modelLabel: string
  params: Record<string, unknown>
  createdAt: string
  duration: number
}
