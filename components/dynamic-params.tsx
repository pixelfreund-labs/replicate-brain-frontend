'use client'

import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import type { SchemaField } from '@/lib/schema'

interface DynamicParamsProps {
  fields: SchemaField[]
  values: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
  disabled?: boolean
}

export function DynamicParams({ fields, values, onChange, disabled }: DynamicParamsProps) {
  const nonPromptFields = fields.filter((f) => !f.isPrompt)

  if (nonPromptFields.length === 0) return null

  return (
    <div className="space-y-3">
      {nonPromptFields.map((field) => (
        <div key={field.key} className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-zinc-400" title={field.description}>
              {field.title}
            </Label>
            {(field.type === 'integer' || field.type === 'number') &&
              field.minimum !== undefined &&
              field.maximum !== undefined && (
                <span className="text-[10px] font-mono text-zinc-500">
                  {String(values[field.key] ?? field.default ?? field.minimum)}
                </span>
              )}
          </div>

          {/* Enum → Select */}
          {field.enum ? (
            <Select
              value={String(values[field.key] ?? field.default ?? field.enum[0])}
              onValueChange={(v) => { if (v) onChange(field.key, v) }}
              disabled={disabled}
            >
              <SelectTrigger className="h-8 text-sm bg-zinc-900 border-zinc-700 text-zinc-100 focus:ring-zinc-600">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700 text-zinc-100">
                {field.enum.map((opt) => (
                  <SelectItem key={opt} value={opt} className="focus:bg-zinc-800 focus:text-zinc-100">
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

          ) : field.type === 'boolean' ? (
            /* Boolean → Switch */
            <div className="flex items-center gap-2">
              <Switch
                checked={Boolean(values[field.key] ?? field.default)}
                onCheckedChange={(v) => onChange(field.key, v)}
                disabled={disabled}
              />
              <span className="text-xs text-zinc-500">
                {String(values[field.key] ?? field.default ?? false)}
              </span>
            </div>

          ) : (field.type === 'integer' || field.type === 'number') &&
            field.minimum !== undefined &&
            field.maximum !== undefined ? (
            /* Number with range → Slider */
            <Slider
              min={field.minimum}
              max={field.maximum}
              step={field.type === 'integer' ? 1 : 0.1}
              value={[Number(values[field.key] ?? field.default ?? field.minimum)]}
              onValueChange={(vals) => {
                const v = Array.isArray(vals) ? vals[0] : vals
                onChange(field.key, v as number)
              }}
              disabled={disabled}
              className="w-full"
            />

          ) : field.type === 'integer' || field.type === 'number' ? (
            /* Number without range → Input */
            <Input
              type="number"
              value={String(values[field.key] ?? field.default ?? '')}
              onChange={(e) => onChange(field.key, field.type === 'integer' ? parseInt(e.target.value) : parseFloat(e.target.value))}
              disabled={disabled}
              className="h-8 text-sm bg-zinc-900 border-zinc-700 text-zinc-100 focus-visible:ring-zinc-600"
            />

          ) : field.key === 'prompt' ? (
            /* Prompt → Textarea (handled in parent) */
            null

          ) : (
            /* String → Input */
            <Input
              value={String(values[field.key] ?? field.default ?? '')}
              onChange={(e) => onChange(field.key, e.target.value)}
              disabled={disabled}
              placeholder={field.description ?? ''}
              className="h-8 text-sm bg-zinc-900 border-zinc-700 text-zinc-100 focus-visible:ring-zinc-600"
            />
          )}
        </div>
      ))}
    </div>
  )
}

/* Standalone prompt field used in parent */
export function PromptField({
  value,
  onChange,
  disabled,
  charCount,
  onSubmit,
}: {
  value: string
  onChange: (v: string) => void
  disabled?: boolean
  charCount?: boolean
  onSubmit?: () => void
}) {
  return (
    <div className="flex flex-col gap-1.5 flex-1">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-zinc-400">Prompt</Label>
        {charCount && <span className="text-[10px] text-zinc-600 font-mono">{value.length}</span>}
      </div>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Describe the image…"
        disabled={disabled}
        className="flex-1 min-h-44 resize-none bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-600 text-sm focus-visible:ring-zinc-600"
        onKeyDown={(e) => { if (e.key === 'Enter' && e.metaKey && onSubmit) onSubmit() }}
      />
    </div>
  )
}
