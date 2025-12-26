import React from "react"
import {
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
  getBezierPath,
} from "reactflow"

export default function CenteredBezierEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
  markerEnd,
}: EdgeProps) {
  const [path, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    curvature: 0.35,
  })

  const label = data?.label
  const stroke = data?.color ?? "#9ca3af"

  return (
    <>
      {/* EDGE PATH */}
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        style={{
          stroke,
          strokeWidth: 1.2,
        }}
      />

      {/* EDGE LABEL */}
      {label && (
        <EdgeLabelRenderer>
          <div
            className="merge-edge-label"
            style={{
              left: labelX,
              top: labelY,
            }}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}
