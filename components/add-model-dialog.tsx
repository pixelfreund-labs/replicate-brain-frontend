'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import type { ModelDef } from '@/lib/models'

interface AddModelDialogProps {
  onAdd: (model: ModelDef) => void
}

export function AddModelDialog({ onAdd }: AddModelDialogProps) {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<ModelDef | null>(null)

  const lookup = async () => {
    if (!input.trim() || !input.includes('/')) {
      setError('Format: owner/model-name')
      return
    }
    setLoading(true)
    setError(null)
    setPreview(null)
    try {
      const res = await fetch(`/api/model-lookup?model=${encodeURIComponent(input.trim())}`)
      const data = await res.json()
      if (!res.ok || data.error) { setError(data.error ?? 'Model not found'); return }
      setPreview(data)
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  const add = () => {
    if (!preview) return
    onAdd(preview)
    setOpen(false)
    setInput('')
    setPreview(null)
    setError(null)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex items-center justify-center rounded-md border border-zinc-700 bg-transparent px-2.5 h-7 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-colors">
        ＋ Model
      </DialogTrigger>
      <DialogContent className="bg-zinc-900 border-zinc-700 text-zinc-100 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-zinc-100 text-sm font-medium">Add Replicate Model</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Model ID</Label>
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="owner/model-name"
                className="bg-zinc-950 border-zinc-700 text-zinc-100 placeholder:text-zinc-600 text-sm focus-visible:ring-zinc-600"
                onKeyDown={(e) => { if (e.key === 'Enter') lookup() }}
              />
              <Button
                onClick={lookup}
                disabled={loading || !input.trim()}
                size="sm"
                className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-100 shrink-0"
              >
                {loading ? '…' : 'Lookup'}
              </Button>
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
          </div>

          {preview && (
            <div className="rounded-lg border border-zinc-700 bg-zinc-950 p-3 space-y-2">
              <div className="flex items-start gap-3">
                {preview.cover_image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={preview.cover_image_url}
                    alt={preview.label}
                    className="w-12 h-12 rounded object-cover shrink-0"
                  />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-100 truncate">{preview.label}</p>
                  <p className="text-xs text-zinc-500 line-clamp-2 mt-0.5">{preview.description}</p>
                </div>
              </div>

              {preview.schema && preview.schema.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {preview.schema.map((f) => (
                    <Badge
                      key={f.key}
                      variant="outline"
                      className="text-[10px] font-mono border-zinc-700 text-zinc-500 px-1.5 py-0"
                    >
                      {f.key}
                    </Badge>
                  ))}
                </div>
              )}

              <Button
                onClick={add}
                className="w-full bg-violet-700 hover:bg-violet-600 text-white text-sm mt-1"
              >
                Add to Models
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
