'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Label } from '@/components/ui/label'
import { DynamicParams, PromptField } from '@/components/dynamic-params'
import { HistoryStrip } from '@/components/history-strip'
import { AddModelDialog } from '@/components/add-model-dialog'
import { BUILTIN_MODELS, CUSTOM_MODELS_KEY, getDefaultValues, type ModelDef, type HistoryEntry } from '@/lib/models'
import { buildInput } from '@/lib/schema'
import Image from 'next/image'

type Status = 'idle' | 'starting' | 'processing' | 'succeeded' | 'failed'

const STATUS_COLOR: Record<Status, string> = {
  idle:       'border-zinc-700 text-zinc-500',
  starting:   'border-yellow-700 text-yellow-300 bg-yellow-950/50',
  processing: 'border-blue-700 text-blue-300 bg-blue-950/50',
  succeeded:  'border-green-700 text-green-300 bg-green-950/50',
  failed:     'border-red-700 text-red-300 bg-red-950/50',
}

export default function Home() {
  const [allModels, setAllModels] = useState<ModelDef[]>(BUILTIN_MODELS)
  const [modelId, setModelId] = useState(BUILTIN_MODELS[0].id)
  const [paramValues, setParamValues] = useState<Record<string, unknown>>(() =>
    getDefaultValues(BUILTIN_MODELS[0].schema ?? [])
  )

  const [status, setStatus]         = useState<Status>('idle')
  const [imageUrl, setImageUrl]     = useState<string | null>(null)
  const [error, setError]           = useState<string | null>(null)
  const [elapsed, setElapsed]       = useState(0)
  const [history, setHistory]       = useState<HistoryEntry[]>([])
  const [activeHistoryId, setActiveHistoryId] = useState<string | undefined>()

  const pollingRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null)
  const startRef   = useRef<number>(0)

  const stopTimers = useCallback(() => {
    if (pollingRef.current) clearTimeout(pollingRef.current)
    if (timerRef.current)   clearInterval(timerRef.current)
  }, [])

  // Load custom models + history from localStorage
  useEffect(() => {
    try {
      const custom = JSON.parse(localStorage.getItem(CUSTOM_MODELS_KEY) ?? '[]') as ModelDef[]
      if (custom.length) setAllModels([...BUILTIN_MODELS, ...custom])
    } catch { /* ignore */ }
    try {
      const saved = JSON.parse(localStorage.getItem('replicate-history') ?? '[]') as HistoryEntry[]
      setHistory(saved)
    } catch { /* ignore */ }
    return stopTimers
  }, [stopTimers])

  const activeModel = allModels.find((m) => m.id === modelId) ?? allModels[0]
  const schema      = activeModel.schema ?? []
  const prompt      = String(paramValues['prompt'] ?? '')

  const setPrompt = (v: string) => setParamValues((prev) => ({ ...prev, prompt: v }))

  const handleModelChange = (id: string) => {
    const m = allModels.find((x) => x.id === id)
    if (!m) return
    setModelId(id)
    setParamValues(getDefaultValues(m.schema ?? []))
  }

  const handleAddModel = (model: ModelDef) => {
    setAllModels((prev) => {
      const next = [...prev, model]
      const custom = next.filter((m) => !BUILTIN_MODELS.find((b) => b.id === m.id))
      localStorage.setItem(CUSTOM_MODELS_KEY, JSON.stringify(custom))
      return next
    })
    handleModelChange(model.id)
  }

  const addToHistory = useCallback((id: string, url: string, dur: number) => {
    const entry: HistoryEntry = {
      id, prompt, imageUrl: url, model: modelId,
      params: { ...paramValues }, createdAt: new Date().toISOString(), duration: dur,
    }
    setHistory((prev) => {
      const next = [entry, ...prev].slice(0, 10)
      localStorage.setItem('replicate-history', JSON.stringify(next))
      return next
    })
    setActiveHistoryId(id)
    // Persist to server log
    fetch('/api/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id, prompt, imageUrl: url, model: modelId,
        modelLabel: activeModel.label, params: { ...paramValues }, duration: dur,
      }),
    }).catch(() => { /* silent */ })
  }, [prompt, modelId, paramValues, activeModel.label])

  const poll = useCallback(async (id: string) => {
    try {
      const res  = await fetch(`/api/prediction/${id}`)
      const data = await res.json()
      if (data.status === 'succeeded') {
        const url = Array.isArray(data.output) ? data.output[0] : data.output
        const dur = Math.floor((Date.now() - startRef.current) / 1000)
        setImageUrl(url); setStatus('succeeded'); stopTimers(); addToHistory(id, url, dur)
      } else if (data.status === 'failed' || data.error) {
        setError(data.error ?? 'Generation failed'); setStatus('failed'); stopTimers()
      } else {
        setStatus(data.status === 'starting' ? 'starting' : 'processing')
        pollingRef.current = setTimeout(() => poll(id), 2000)
      }
    } catch {
      setError('Network error while polling'); setStatus('failed'); stopTimers()
    }
  }, [stopTimers, addToHistory])

  const generate = async () => {
    if (!prompt.trim() || status === 'starting' || status === 'processing') return
    stopTimers()
    setStatus('starting'); setImageUrl(null); setError(null); setElapsed(0); setActiveHistoryId(undefined)
    startRef.current = Date.now()
    timerRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 1000)
    try {
      const input = buildInput(schema, paramValues)
      const res   = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input, endpoint: activeModel.endpoint, modelId }),
      })
      const data = await res.json()
      if (!res.ok || data.error) { setError(data.error ?? 'API error'); setStatus('failed'); stopTimers(); return }
      if (data.status === 'succeeded') {
        const url = Array.isArray(data.output) ? data.output[0] : data.output
        const dur = Math.floor((Date.now() - startRef.current) / 1000)
        setImageUrl(url); setStatus('succeeded'); stopTimers(); addToHistory(data.id, url, dur)
      } else {
        setStatus(data.status === 'starting' ? 'starting' : 'processing')
        pollingRef.current = setTimeout(() => poll(data.id), 2000)
      }
    } catch {
      setError('Network error'); setStatus('failed'); stopTimers()
    }
  }

  const isGenerating = status === 'starting' || status === 'processing'

  const handleSave = () => {
    if (!imageUrl) return
    const a    = document.createElement('a')
    a.href     = imageUrl
    const ts   = new Date().toISOString().slice(0, 10)
    const slug = prompt.slice(0, 40).toLowerCase().replace(/[^a-z0-9]+/g, '-')
    const fmt  = String(paramValues['output_format'] ?? 'jpg')
    a.download = `${ts}-${slug}.${fmt}`; a.target = '_blank'; a.click()
  }

  const handleHistorySelect = (entry: HistoryEntry) => {
    setImageUrl(entry.imageUrl); setPrompt(entry.prompt)
    setActiveHistoryId(entry.id); setStatus('succeeded'); setError(null)
  }

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-100">

      {/* Header */}
      <header className="shrink-0 border-b border-zinc-800 bg-zinc-950 px-6 py-3 flex items-center gap-3">
        <span className="text-sm font-semibold font-mono text-zinc-100">replicate.brain</span>
        <Separator orientation="vertical" className="h-4 bg-zinc-700" />
        <span className="text-xs text-zinc-500">Nano-Banana-PRO via Replicate</span>
        <div className="ml-auto flex items-center gap-2">
          {status !== 'idle' && (
            <Badge variant="outline" className={`text-[10px] font-mono ${STATUS_COLOR[status]}`}>
              {status}{isGenerating && elapsed > 0 ? ` · ${elapsed}s` : ''}
            </Badge>
          )}
          <Link href="/playground">
            <Button variant="outline" size="sm" className="border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 text-xs h-7 px-2.5">
              🎞 Playground
            </Button>
          </Link>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left panel */}
        <aside className="w-72 shrink-0 border-r border-zinc-800 bg-zinc-950 flex flex-col gap-4 px-5 py-5 overflow-y-auto">

          {/* Model selector */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-zinc-400">Modell</Label>
              <AddModelDialog onAdd={handleAddModel} />
            </div>
            <Select value={modelId} onValueChange={(v) => { if (v) handleModelChange(v) }} disabled={isGenerating}>
              <SelectTrigger className="h-8 text-sm bg-zinc-900 border-zinc-700 text-zinc-100 focus:ring-zinc-600">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700 text-zinc-100">
                {allModels.map((m) => (
                  <SelectItem key={m.id} value={m.id} className="focus:bg-zinc-800 focus:text-zinc-100">
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Prompt */}
          <PromptField
            value={prompt}
            onChange={setPrompt}
            disabled={isGenerating}
            charCount
            onSubmit={generate}
          />

          <Separator className="bg-zinc-800" />

          {/* Dynamic params */}
          <DynamicParams
            fields={schema}
            values={paramValues}
            onChange={(k, v) => setParamValues((prev) => ({ ...prev, [k]: v }))}
            disabled={isGenerating}
          />

          <div className="space-y-1 mt-auto">
            <Button
              onClick={generate}
              disabled={!prompt.trim() || isGenerating}
              className="w-full bg-violet-700 hover:bg-violet-600 text-white font-medium"
            >
              {isGenerating ? (
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Generating…
                </span>
              ) : '▶ Generate'}
            </Button>
            <p className="text-[10px] text-zinc-600 text-center">⌘ + Enter</p>
          </div>
        </aside>

        {/* Right panel */}
        <main className="flex-1 flex flex-col gap-4 p-6 overflow-y-auto bg-zinc-950">
          <div className="flex-1 flex items-center justify-center min-h-64 rounded-lg border border-zinc-800 bg-zinc-900">
            {imageUrl ? (
              <Image src={imageUrl} alt={prompt} width={1280} height={720}
                className="rounded-lg object-contain max-h-[65vh] w-auto shadow-2xl" unoptimized />
            ) : isGenerating ? (
              <div className="flex flex-col items-center gap-4 text-zinc-500">
                <div className="w-10 h-10 border-2 border-zinc-700 border-t-violet-500 rounded-full animate-spin" />
                <p className="text-sm font-mono">{status === 'starting' ? 'Starting…' : `Processing… ${elapsed}s`}</p>
              </div>
            ) : error ? (
              <div className="text-center space-y-1.5">
                <p className="text-red-400 text-sm font-medium">Generation failed</p>
                <p className="text-xs text-zinc-500 max-w-sm">{error}</p>
              </div>
            ) : (
              <div className="text-center space-y-2 text-zinc-600">
                <p className="text-3xl">🎨</p>
                <p className="text-sm">Enter a prompt and press Generate</p>
              </div>
            )}
          </div>

          {imageUrl && status === 'succeeded' && (
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(prompt)}
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 text-xs">
                📋 Copy Prompt
              </Button>
              <Button size="sm" onClick={handleSave}
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs border border-zinc-700">
                💾 Save Image
              </Button>
            </div>
          )}

          <HistoryStrip history={history} onSelect={handleHistorySelect} activeId={activeHistoryId} />
        </main>
      </div>
    </div>
  )
}
