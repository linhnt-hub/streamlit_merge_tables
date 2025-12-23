import React from "react"
import { TableMeta } from "../types"

interface Props {
  tables: TableMeta[]
  selectedTableId: string
  selectedKeys: string[]
  onTableChange(id: string): void
  onKeysChange(keys: string[]): void
}

export default function TableCard({
  tables,
  selectedTableId,
  selectedKeys,
  onTableChange,
  onKeysChange,
}: Props) {
  const table = tables.find((t) => t.id === selectedTableId)

  const toggleKey = (key: string) => {
    if (selectedKeys.includes(key)) {
      onKeysChange(selectedKeys.filter((k) => k !== key))
    } else {
      onKeysChange([...selectedKeys, key])
    }
  }

  return (
    <div className="table-card">
      <select
        className="table-select"
        value={selectedTableId}
        onChange={(e) => onTableChange(e.target.value)}
      >
        {tables.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>

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
