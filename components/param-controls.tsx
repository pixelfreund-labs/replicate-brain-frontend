'use client'

import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { ASPECT_RATIOS, OUTPUT_FORMATS, type AspectRatio, type OutputFormat } from '@/lib/models'

interface ParamControlsProps {
  aspectRatio: AspectRatio
  outputFormat: OutputFormat
  outputQuality: number
  onChange: (key: string, value: string | number) => void
  disabled?: boolean
}

export function ParamControls({
  aspectRatio,
  outputFormat,
  outputQuality,
  onChange,
  disabled,
}: ParamControlsProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-zinc-400">Aspect Ratio</Label>
          <Select
            value={aspectRatio}
            onValueChange={(v) => { if (v) onChange('aspect_ratio', v) }}
            disabled={disabled}
          >
            <SelectTrigger className="h-8 text-sm bg-zinc-900 border-zinc-700 text-zinc-100 focus:ring-zinc-600">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700 text-zinc-100">
              {ASPECT_RATIOS.map((r) => (
                <SelectItem key={r} value={r} className="focus:bg-zinc-800 focus:text-zinc-100">
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-zinc-400">Format</Label>
          <Select
            value={outputFormat}
            onValueChange={(v) => { if (v) onChange('output_format', v) }}
            disabled={disabled}
          >
            <SelectTrigger className="h-8 text-sm bg-zinc-900 border-zinc-700 text-zinc-100 focus:ring-zinc-600">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700 text-zinc-100">
              {OUTPUT_FORMATS.map((f) => (
                <SelectItem key={f} value={f} className="focus:bg-zinc-800 focus:text-zinc-100">
                  {f}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-zinc-400">Quality</Label>
          <span className="text-xs font-mono text-zinc-400">{outputQuality}</span>
        </div>
        <Slider
          min={50}
          max={100}
          step={5}
          value={[outputQuality]}
          onValueChange={(vals) => { const v = Array.isArray(vals) ? vals[0] : vals; onChange('output_quality', v as number) }}
          disabled={disabled}
          className="w-full"
        />
      </div>
    </div>
  )
}
