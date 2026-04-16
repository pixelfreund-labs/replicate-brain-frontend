'use client'

import Image from 'next/image'
import { cn } from '@/lib/utils'
import type { HistoryEntry } from '@/lib/models'

interface HistoryStripProps {
  history: HistoryEntry[]
  onSelect: (entry: HistoryEntry) => void
  activeId?: string
}

export function HistoryStrip({ history, onSelect, activeId }: HistoryStripProps) {
  if (history.length === 0) return null

  return (
    <div className="border-t border-zinc-800 pt-3">
      <p className="text-[11px] text-zinc-500 mb-2 uppercase tracking-wider">History</p>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {history.map((entry) => (
          <button
            key={entry.id}
            onClick={() => onSelect(entry)}
            className={cn(
              'shrink-0 rounded-md overflow-hidden border-2 transition-colors',
              activeId === entry.id ? 'border-violet-500' : 'border-zinc-700 hover:border-zinc-500',
            )}
            title={entry.prompt.slice(0, 80)}
          >
            <Image
              src={entry.imageUrl}
              alt={entry.prompt.slice(0, 40)}
              width={64}
              height={64}
              className="object-cover w-16 h-16"
              unoptimized
            />
          </button>
        ))}
      </div>
    </div>
  )
}
