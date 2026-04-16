'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { ParamControls } from '@/components/param-controls'
import { HistoryStrip } from '@/components/history-strip'
import {
  MODELS,
  type AspectRatio,
  type OutputFormat,
  type HistoryEntry,
} from '@/lib/models'
import Image from 'next/image'

type Status = 'idle' | 'starting' | 'processing' | 'succeeded' | 'failed'

const STATUS_COLOR: Record<Status, string> = {
  idle: 'border-zinc-700 text-zinc-500',
  starting: 'border-yellow-700 text-yellow-300 bg-yellow-950/50',
  processing: 'border-blue-700 text-blue-300 bg-blue-950/50',
  succeeded: 'border-green-700 text-green-300 bg-green-950/50',
  failed: 'border-red-700 text-red-300 bg-red-950/50',
}

export default function Home() {
  const [prompt, setPrompt] = useState('')
  const [model, setModel] = useState('nano-banana-pro')
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9')
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('jpg')
  const [outputQuality, setOutputQuality] = useState(80)

  const [status, setStatus] = useState<Status>('idle')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [activeHistoryId, setActiveHistoryId] = useState<string | undefined>()

  const pollingRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startRef = useRef<number>(0)

  const stopTimers = useCallback(() => {
    if (pollingRef.current) clearTimeout(pollingRef.current)
    if (timerRef.current) clearInterval(timerRef.current)
  }, [])

  useEffect(() => {
    const saved = localStorage.getItem('replicate-history')
    if (saved) {
      try { setHistory(JSON.parse(saved)) } catch { /* ignore */ }
    }
    return stopTimers
  }, [stopTimers])

  const addToHistory = useCallback((id: string, url: string) => {
    const entry: HistoryEntry = {
      id,
      prompt,
      imageUrl: url,
      model,
      aspect_ratio: aspectRatio,
      createdAt: new Date().toISOString(),
    }
    setHistory((prev) => {
      const next = [entry, ...prev].slice(0, 10)
      localStorage.setItem('replicate-history', JSON.stringify(next))
      return next
    })
    setActiveHistoryId(id)
  }, [prompt, model, aspectRatio])

  const poll = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/prediction/${id}`)
      const data = await res.json()

      if (data.status === 'succeeded') {
        const url = Array.isArray(data.output) ? data.output[0] : data.output
        setImageUrl(url)
        setStatus('succeeded')
        stopTimers()
        addToHistory(id, url)
      } else if (data.status === 'failed' || data.error) {
        setError(data.error ?? 'Generation failed')
        setStatus('failed')
        stopTimers()
      } else {
        setStatus(data.status === 'starting' ? 'starting' : 'processing')
        pollingRef.current = setTimeout(() => poll(id), 2000)
      }
    } catch {
      setError('Network error while polling')
      setStatus('failed')
      stopTimers()
    }
  }, [stopTimers, addToHistory])

  const generate = async () => {
    if (!prompt.trim() || status === 'starting' || status === 'processing') return

    stopTimers()
    setStatus('starting')
    setImageUrl(null)
    setError(null)
    setElapsed(0)
    setActiveHistoryId(undefined)

    startRef.current = Date.now()
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000))
    }, 1000)

    try {
      const res = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          model,
          aspect_ratio: aspectRatio,
          output_format: outputFormat,
          output_quality: outputQuality,
        }),
      })
      const data = await res.json()

      if (!res.ok || data.error) {
        setError(data.error ?? 'API error')
        setStatus('failed')
        stopTimers()
        return
      }

      // Prefer: wait — may already be done
      if (data.status === 'succeeded') {
        const url = Array.isArray(data.output) ? data.output[0] : data.output
        setImageUrl(url)
        setStatus('succeeded')
        stopTimers()
        addToHistory(data.id, url)
      } else {
        setStatus(data.status === 'starting' ? 'starting' : 'processing')
        pollingRef.current = setTimeout(() => poll(data.id), 2000)
      }
    } catch {
      setError('Network error')
      setStatus('failed')
      stopTimers()
    }
  }

  const isGenerating = status === 'starting' || status === 'processing'

  const handleSave = () => {
    if (!imageUrl) return
    const a = document.createElement('a')
    a.href = imageUrl
    const ts = new Date().toISOString().slice(0, 10)
    const slug = prompt.slice(0, 40).toLowerCase().replace(/[^a-z0-9]+/g, '-')
    a.download = `${ts}-${slug}.${outputFormat}`
    a.target = '_blank'
    a.click()
  }

  const handleHistorySelect = (entry: HistoryEntry) => {
    setImageUrl(entry.imageUrl)
    setPrompt(entry.prompt)
    setActiveHistoryId(entry.id)
    setStatus('succeeded')
    setError(null)
  }

  const handleParam = (key: string, value: string | number) => {
    if (key === 'aspect_ratio') setAspectRatio(value as AspectRatio)
    if (key === 'output_format') setOutputFormat(value as OutputFormat)
    if (key === 'output_quality') setOutputQuality(value as number)
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-3 flex items-center gap-3 shrink-0">
        <span className="text-sm font-semibold font-mono text-zinc-100">replicate.brain</span>
        <Separator orientation="vertical" className="h-4 bg-zinc-700" />
        <span className="text-xs text-zinc-500">Nano-Banana-PRO via Replicate</span>
        {status !== 'idle' && (
          <Badge variant="outline" className={`ml-auto text-[10px] font-mono ${STATUS_COLOR[status]}`}>
            {status}{isGenerating && elapsed > 0 ? ` · ${elapsed}s` : ''}
          </Badge>
        )}
      </header>

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel */}
        <div className="w-80 shrink-0 border-r border-zinc-800 flex flex-col p-5 gap-5 overflow-y-auto">
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Modell</Label>
            <Select value={model} onValueChange={(v) => { if (v) setModel(v) }} disabled={isGenerating}>
              <SelectTrigger className="h-8 text-sm bg-zinc-900 border-zinc-700 text-zinc-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                {MODELS.map((m) => (
                  <SelectItem key={m.id} value={m.id} className="text-zinc-100 focus:bg-zinc-800">
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 flex-1 flex flex-col">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-zinc-400">Prompt</Label>
              <span className="text-[10px] text-zinc-600 font-mono">{prompt.length}</span>
            </div>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the image you want to generate…"
              disabled={isGenerating}
              className="flex-1 min-h-48 resize-none bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-600 text-sm focus-visible:ring-zinc-600"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.metaKey) generate()
              }}
            />
          </div>

          <Separator className="bg-zinc-800" />

          <ParamControls
            aspectRatio={aspectRatio}
            outputFormat={outputFormat}
            outputQuality={outputQuality}
            onChange={handleParam}
            disabled={isGenerating}
          />

          <div className="space-y-1">
            <Button
              onClick={generate}
              disabled={!prompt.trim() || isGenerating}
              className="w-full bg-violet-700 hover:bg-violet-600 text-white"
            >
              {isGenerating ? (
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Generating…
                </span>
              ) : (
                '▶ Generate'
              )}
            </Button>
            <p className="text-[10px] text-zinc-600 text-center">⌘ + Enter</p>
          </div>
        </div>

        {/* Right Panel – Preview */}
        <div className="flex-1 flex flex-col p-6 gap-4 overflow-y-auto">
          <div className="flex-1 flex items-center justify-center min-h-64">
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt={prompt}
                width={1280}
                height={720}
                className="rounded-lg object-contain max-h-[65vh] w-auto shadow-2xl"
                unoptimized
              />
            ) : isGenerating ? (
              <div className="flex flex-col items-center gap-4 text-zinc-500">
                <div className="w-12 h-12 border-2 border-zinc-700 border-t-violet-500 rounded-full animate-spin" />
                <p className="text-sm">
                  {status === 'starting' ? 'Starting…' : `Processing… ${elapsed}s`}
                </p>
              </div>
            ) : error ? (
              <div className="text-center space-y-2">
                <p className="text-red-400 text-sm font-medium">Generation failed</p>
                <p className="text-xs text-zinc-500 max-w-sm">{error}</p>
              </div>
            ) : (
              <div className="text-center text-zinc-600 space-y-2">
                <p className="text-4xl">🎨</p>
                <p className="text-sm">Enter a prompt and press Generate</p>
              </div>
            )}
          </div>

          {imageUrl && status === 'succeeded' && (
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigator.clipboard.writeText(prompt)}
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 text-xs"
              >
                📋 Copy Prompt
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs border border-zinc-700"
              >
                💾 Save Image
              </Button>
            </div>
          )}

          <HistoryStrip
            history={history}
            onSelect={handleHistorySelect}
            activeId={activeHistoryId}
          />
        </div>
      </div>
    </div>
  )
}
