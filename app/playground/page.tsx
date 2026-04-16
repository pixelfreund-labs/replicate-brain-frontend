'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Search } from 'lucide-react'
import type { LogEntry } from '@/lib/models'

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('de-CH', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function PlaygroundPage() {
  const [entries, setEntries] = useState<LogEntry[]>([])
  const [query, setQuery]     = useState('')
  const [activeModel, setActiveModel] = useState('all')

  useEffect(() => {
    fetch('/api/log').then((r) => r.json()).then(setEntries).catch(() => setEntries([]))
  }, [])

  const models = useMemo(() => {
    const seen = new Set<string>()
    entries.forEach((e) => seen.add(e.modelLabel ?? e.model))
    return Array.from(seen)
  }, [entries])

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      const matchesModel = activeModel === 'all' || (e.modelLabel ?? e.model) === activeModel
      const q = query.toLowerCase()
      const matchesQuery = !q || e.prompt.toLowerCase().includes(q) || (e.modelLabel ?? e.model).toLowerCase().includes(q)
      return matchesModel && matchesQuery
    })
  }, [entries, activeModel, query])

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-100">

      {/* Header */}
      <header className="shrink-0 border-b border-zinc-800 bg-zinc-950 px-6 py-3 flex items-center gap-3">
        <Link href="/" className="text-sm font-semibold font-mono text-zinc-400 hover:text-zinc-100 transition-colors">
          replicate.brain
        </Link>
        <Separator orientation="vertical" className="h-4 bg-zinc-700" />
        <span className="text-sm font-medium text-zinc-100">Playground</span>
        <Badge variant="outline" className="font-mono text-[10px] border-zinc-700 text-zinc-500">
          {entries.length} Generations
        </Badge>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-6">

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center mb-6">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-zinc-500" />
            <Input
              placeholder="Prompt suchen…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-8 bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-600 h-9 text-sm focus-visible:ring-zinc-600"
            />
          </div>
          <Tabs value={activeModel} onValueChange={setActiveModel}>
            <TabsList className="bg-zinc-900 border border-zinc-800 h-9 gap-0.5">
              <TabsTrigger value="all" className="text-xs data-[state=active]:bg-zinc-700 data-[state=active]:text-zinc-100 text-zinc-400">
                Alle ({entries.length})
              </TabsTrigger>
              {models.map((m) => (
                <TabsTrigger key={m} value={m} className="text-xs data-[state=active]:bg-zinc-700 data-[state=active]:text-zinc-100 text-zinc-400">
                  {m} ({entries.filter((e) => (e.modelLabel ?? e.model) === m).length})
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        <p className="text-xs text-zinc-500 mb-4">
          {filtered.length} {filtered.length === 1 ? 'Generation' : 'Generierungen'}
          {query && ` · "${query}"`}
        </p>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-zinc-600 space-y-2">
            <p className="text-3xl">🎞</p>
            <p className="text-sm">{entries.length === 0 ? 'Noch keine Generierungen. Starte im Generator.' : 'Keine Treffer.'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((entry) => (
              <div key={entry.id} className="rounded-lg border border-zinc-800 bg-zinc-900 overflow-hidden group hover:border-zinc-600 transition-colors">
                {/* Image */}
                <div className="aspect-video bg-zinc-950 flex items-center justify-center overflow-hidden">
                  <Image
                    src={entry.imageUrl}
                    alt={entry.prompt}
                    width={640}
                    height={360}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                </div>

                {/* Meta */}
                <div className="px-3 py-2.5 space-y-1.5">
                  <p className="text-xs text-zinc-200 line-clamp-2 leading-relaxed">{entry.prompt}</p>
                  <div className="flex items-center justify-between gap-2 pt-0.5">
                    <Badge variant="outline" className="text-[10px] font-mono border-zinc-700 text-zinc-500 px-1.5 py-0">
                      {entry.modelLabel ?? entry.model}
                    </Badge>
                    <div className="flex items-center gap-2 text-[10px] text-zinc-600 font-mono">
                      {entry.duration != null && <span>{entry.duration}s</span>}
                      <span>{formatDate(entry.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
