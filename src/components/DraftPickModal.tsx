"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import ecrData from "@/data/ecr-top500.json"

type EcrPlayer = {
  rank: number
  name: string
  team: string
  position: string
}

export type CellInfo = {
  round: number
  pickNumber: number
  slotIndex: number
  owner: string
  originalOwner?: string
  // Edit mode fields
  existingPick?: {
    id: string
    player_name: string
    player_position?: string
    player_team?: string
    ecr_rank?: number
  }
}

interface DraftPickModalProps {
  cell: CellInfo
  draftedNames: Set<string>
  ownerColors: { bg: string; border: string; text: string }
  onClose: () => void
  onSave: (pick: {
    round: number
    pick_number: number
    slot_index: number
    owner: string
    original_owner?: string
    player_name: string
    player_position?: string
    player_team?: string
    ecr_rank?: number
    id?: string
  }) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

const players = ecrData as EcrPlayer[]

export default function DraftPickModal({ cell, draftedNames, ownerColors, onClose, onSave, onDelete }: DraftPickModalProps) {
  const [search, setSearch] = useState(cell.existingPick?.player_name ?? "")
  const [manualName, setManualName] = useState("")
  const [manualPos, setManualPos] = useState("")
  const [manualTeam, setManualTeam] = useState("")
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const isEdit = !!cell.existingPick

  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    },
    [onClose]
  )

  useEffect(() => {
    document.addEventListener("keydown", handleEscape)
    document.body.style.overflow = "hidden"
    // Focus search input on open
    setTimeout(() => inputRef.current?.focus(), 50)
    return () => {
      document.removeEventListener("keydown", handleEscape)
      document.body.style.overflow = ""
    }
  }, [handleEscape])

  const normalizeStr = (s: string) =>
    s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()

  const searchNorm = normalizeStr(search)
  const filtered = search.length >= 2
    ? players.filter(p => normalizeStr(p.name).includes(searchNorm)).slice(0, 20)
    : []

  const handleSelectPlayer = async (player: EcrPlayer) => {
    if (draftedNames.has(player.name)) return
    setSaving(true)
    try {
      await onSave({
        round: cell.round,
        pick_number: cell.pickNumber,
        slot_index: cell.slotIndex,
        owner: cell.owner,
        original_owner: cell.originalOwner,
        player_name: player.name,
        player_position: player.position,
        player_team: player.team,
        ecr_rank: player.rank,
        id: cell.existingPick?.id,
      })
      onClose()
    } catch {
      setSaving(false)
    }
  }

  const handleManualAdd = async () => {
    if (!manualName.trim()) return
    setSaving(true)
    try {
      await onSave({
        round: cell.round,
        pick_number: cell.pickNumber,
        slot_index: cell.slotIndex,
        owner: cell.owner,
        original_owner: cell.originalOwner,
        player_name: manualName.trim(),
        player_position: manualPos.trim() || undefined,
        player_team: manualTeam.trim() || undefined,
        id: cell.existingPick?.id,
      })
      onClose()
    } catch {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!cell.existingPick?.id) return
    setSaving(true)
    try {
      await onDelete(cell.existingPick.id)
      onClose()
    } catch {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-card border border-primary/20 rounded-xl shadow-2xl w-full max-w-md mx-4 max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`px-4 py-3 rounded-t-xl border-b border-primary/10 ${ownerColors.bg}`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className={`font-bold text-base ${ownerColors.text}`}>
                Round {cell.round}, Pick {cell.pickNumber}
              </h2>
              <p className={`text-xs ${ownerColors.text} opacity-70`}>
                {cell.owner}{cell.originalOwner ? ` (from ${cell.originalOwner})` : ''}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-foreground/60 hover:text-foreground transition-colors text-xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/10"
              aria-label="Close"
            >
              x
            </button>
          </div>
        </div>

        {/* Search — pinned at top */}
        <div className="px-4 pt-4 pb-2 shrink-0">
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search player..."
              className="w-full px-3 py-2 pl-8 rounded-lg border border-primary/20 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              disabled={saving}
            />
            <span className="absolute left-2.5 top-2.5 text-muted-foreground text-sm">
              ?
            </span>
          </div>
        </div>

        {/* Search Results — fixed height scrollable area */}
        <div className="h-[240px] overflow-y-auto border-y border-primary/10 shrink-0">
          {filtered.length > 0 ? (
            <div className="divide-y divide-border/50">
              {filtered.map((player) => {
                const isDrafted = draftedNames.has(player.name)
                return (
                  <button
                    key={player.rank}
                    onClick={() => handleSelectPlayer(player)}
                    disabled={isDrafted || saving}
                    className={`w-full text-left px-4 py-2 flex items-center gap-3 transition-colors ${
                      isDrafted
                        ? 'opacity-40 cursor-not-allowed bg-muted/50'
                        : 'hover:bg-primary/10 cursor-pointer'
                    }`}
                  >
                    <span className="text-xs font-mono text-muted-foreground w-8 text-right shrink-0">
                      #{player.rank}
                    </span>
                    <div className="flex-1 min-w-0 truncate">
                      <span className="font-semibold text-sm text-foreground truncate">
                        {player.name}
                      </span>
                      {isDrafted && (
                        <span className="ml-2 text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          DRAFTED
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-mono text-muted-foreground shrink-0">
                      {player.position.split(',')[0]}
                    </span>
                    <span className="text-xs font-mono text-muted-foreground shrink-0 w-8">
                      {player.team}
                    </span>
                  </button>
                )
              })}
            </div>
          ) : search.length >= 2 ? (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
              No ECR players found matching &ldquo;{search}&rdquo;
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
              Type 2+ characters to search...
            </div>
          )}
        </div>

        {/* Manual Entry — pinned at bottom */}
        <div className="px-4 py-3 shrink-0">
          <p className="text-xs font-mono text-muted-foreground mb-2 text-center">
            -- Or enter manually --
          </p>
          <div className="space-y-2">
            <input
              type="text"
              value={manualName}
              onChange={(e) => setManualName(e.target.value)}
              placeholder="Player name"
              className="w-full px-3 py-1.5 rounded border border-primary/20 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              disabled={saving}
            />
            <div className="flex gap-2">
              <input
                type="text"
                value={manualPos}
                onChange={(e) => setManualPos(e.target.value)}
                placeholder="Pos (e.g. SS)"
                className="flex-1 px-3 py-1.5 rounded border border-primary/20 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                disabled={saving}
              />
              <input
                type="text"
                value={manualTeam}
                onChange={(e) => setManualTeam(e.target.value)}
                placeholder="Team (e.g. NYY)"
                className="flex-1 px-3 py-1.5 rounded border border-primary/20 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                disabled={saving}
              />
            </div>
            <button
              onClick={handleManualAdd}
              disabled={!manualName.trim() || saving}
              className="w-full py-2 rounded-lg bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Saving...' : isEdit ? 'Update Pick' : 'Add Player'}
            </button>
          </div>

          {/* Delete button in edit mode */}
          {isEdit && (
            <button
              onClick={handleDelete}
              disabled={saving}
              className="w-full mt-2 py-2 rounded-lg bg-red-600 text-white font-bold text-sm hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Removing...' : 'Remove Pick'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
