import React from "react"
import { MergePlan } from "../types"

interface Props {
  onAction(mode: MergePlan["saveMode"]): void
  disabled?: boolean
  reason?: string
}

export default function FooterActions({
  onAction,
  disabled,
  reason,
}: Props) {
  return (
    <div className="footer-actions">
      <button
        className="primary"
        disabled={disabled}
        title={disabled ? reason : "Execute merge"}
        onClick={() => onAction("final")}
      >
        Save final result
      </button>

      {disabled && reason && (
        <div
          style={{
            marginTop: 6,
            fontSize: 12,
            color: "#dc2626",
          }}
        >
          {reason}
        </div>
      )}
    </div>
  )
}
