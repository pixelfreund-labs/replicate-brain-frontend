export interface ModelDef {
  id: string
  label: string
  description: string
}

export const MODELS: ModelDef[] = [
  {
    id: 'nano-banana-pro',
    label: 'Nano-Banana-PRO',
    description: 'Google via Replicate – Editorial illustration',
  },
]

export const ASPECT_RATIOS = ['1:1', '16:9', '9:16', '4:3', '3:4', '21:9'] as const
export const OUTPUT_FORMATS = ['jpg', 'png', 'webp'] as const

export type AspectRatio = (typeof ASPECT_RATIOS)[number]
export type OutputFormat = (typeof OUTPUT_FORMATS)[number]

export interface PredictionParams {
  prompt: string
  model: string
  aspect_ratio: AspectRatio
  output_format: OutputFormat
  output_quality: number
}

export interface HistoryEntry {
  id: string
  prompt: string
  imageUrl: string
  model: string
  aspect_ratio: string
  createdAt: string
}
