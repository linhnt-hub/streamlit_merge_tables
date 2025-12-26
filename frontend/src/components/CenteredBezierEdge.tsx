import { BaseEdge, EdgeProps, getBezierPath } from "reactflow"

export default function CenteredBezierEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
  markerEnd,
}: EdgeProps) {
  const [path] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    curvature: 0.35,
  })

  const stroke = data?.color ?? "#9ca3af"

  return (
    <BaseEdge
      path={path}
      markerEnd={markerEnd}
      animated={true}
      type="default"
      style={{
        stroke,
        strokeWidth: 1,
        transition: "stroke 0.2s ease, stroke-width 0.2s ease",
      }}
      className="merge-edge"
    />
  )
}
