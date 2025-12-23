import React from "react"
import { JoinType } from "../types"

export default function JoinConnector({
  joinType,
  onChange,
}: {
  joinType: JoinType
  onChange(type: JoinType): void
}) {
  return (
    <div className="join-connector">
      <span className="arrow">→</span>
      <select
        value={joinType}
        onChange={(e) => onChange(e.target.value as JoinType)}
      >
        <option value="inner">INNER</option>
        <option value="left">LEFT</option>
        <option value="right">RIGHT</option>
        <option value="outer">OUTER</option>
      </select>
    </div>
  )
}