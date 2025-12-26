import React, { useEffect, useRef, useState } from "react"
import { TableMeta } from "../types"

interface Props {
  tables: TableMeta[]
  selectedTableId: string
  selectedKeys: string[]
  onTableChange(id: string): void
  onKeysChange(keys: string[]): void
  disabledTableSelect?: boolean
  onHover?(id: string | null): void
}

export default function TableCard({
  tables,
  selectedTableId,
  selectedKeys,
  onTableChange,
  onKeysChange,
  disabledTableSelect,
  onHover,
}: Props) {
  const table = tables.find((t) => t.id === selectedTableId)

  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const toggleKey = (key: string) => {
    if (selectedKeys.includes(key)) {
      onKeysChange(selectedKeys.filter((k) => k !== key))
    } else {
      onKeysChange([...selectedKeys, key])
    }
  }

  /* ---- click outside to close ---- */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  return (
    <div
      className="table-card"
      ref={ref}
      onMouseEnter={() => onHover?.(selectedTableId)}
      onMouseLeave={() => onHover?.(null)}
    >
      {/* ---------- HEADER ---------- */}
      <div className="table-header">
        <select
          className="table-select"
          value={selectedTableId}
          disabled={disabledTableSelect}
          onChange={(e) => onTableChange(e.target.value)}
        >
          {tables.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>

        {/* preview trigger */}
        <div
          className={`table-preview-trigger ${open ? "active" : ""}`}
          title="Preview columns"
          onClick={(e) => {
            e.stopPropagation()
            setOpen((v) => !v)
          }}
        >
          👁
        </div>

        {/* popover */}
        {open && (
          <div className="table-preview-popover">
            <div className="preview-title">Columns</div>

            {table?.columns?.length ? (
              <ul>
                {table.columns.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            ) : (
              <div className="preview-empty">No columns</div>
            )}
          </div>
        )}
      </div>

      {/* ---------- COLUMNS ---------- */}
      <div className="chip-container">
        {table?.columns.map((col) => (
          <span
            key={col}
            className={`chip ${
              selectedKeys.includes(col) ? "active" : ""
            }`}
            onClick={() => toggleKey(col)}
          >
            {col}
          </span>
        ))}
      </div>

      <div className="chip-hint">
        {selectedKeys.length} column(s) selected
      </div>
    </div>
  )
}
