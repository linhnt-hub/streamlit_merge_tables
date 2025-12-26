// frontend/src/components/MergeDAGView.tsx

import React, { useEffect, useMemo, useRef } from "react"
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  ReactFlowInstance,
  Position,
} from "reactflow"
import "reactflow/dist/style.css"
import { MergeDAG } from "../dag"
import CenteredBezierEdge from "./CenteredBezierEdge"

interface Props {
  dag: MergeDAG
}

const NODE_W = 160
const NODE_H = 48
const H_GAP = 80
const V_GAP = 90

const edgeTypes = {
  centered: CenteredBezierEdge,
}

export default function MergeDAGView({ dag }: Props) {
  const rfInstance = useRef<ReactFlowInstance | null>(null)

  const nodes: Node[] = []
  const edges: Edge[] = []

  const sourceNodes = dag.nodes.filter((n) => n.type === "source")
  const mergeNodes = dag.nodes.filter((n) => n.type === "merge")

  /* =====================================================
     CHAIN MODE
     ===================================================== */
  if (dag.mode === "chain") {
    const dagHeight =
      sourceNodes.length * NODE_H +
      (sourceNodes.length - 1) * V_GAP

    sourceNodes.forEach((n, i) => {
      nodes.push({
        id: n.id,
        data: { label: n.label },
        position: { x: 0, y: i * (NODE_H + V_GAP) },
        sourcePosition: Position.Right,
        style: sourceStyle,
        draggable: false,
        selectable: false,
      })
    })

    const mergeY = dagHeight / 2 - NODE_H / 2

    mergeNodes.forEach((n, i) => {
      nodes.push({
        id: n.id,
        data: { label: n.label },
        position: {
          x: (i + 1) * (NODE_W + H_GAP),
          y: mergeY,
        },
        targetPosition: Position.Left,
        sourcePosition: Position.Right,
        style: mergeStyle,
        draggable: false,
        selectable: false,
      })
    })
  }

  /* =====================================================
     PAIRWISE MODE (RESTORED)
     ===================================================== */
  if (dag.mode === "pairwise") {
    let pairIndex = 0

    for (let i = 0; i < sourceNodes.length; i += 2) {
      const left = sourceNodes[i]
      const right = sourceNodes[i + 1]
      const merge = mergeNodes[pairIndex]

      const baseX = pairIndex * (NODE_W * 2 + H_GAP * 2)

      if (left) {
        nodes.push({
          id: left.id,
          data: { label: left.label },
          position: { x: baseX, y: 0 },
          sourcePosition: Position.Bottom,
          style: sourceStyle,
          draggable: false,
          selectable: false,
        })
      }

      if (right) {
        nodes.push({
          id: right.id,
          data: { label: right.label },
          position: { x: baseX + NODE_W + H_GAP, y: 0 },
          sourcePosition: Position.Bottom,
          style: sourceStyle,
          draggable: false,
          selectable: false,
        })
      }

      if (merge && left && right) {
        nodes.push({
          id: merge.id,
          data: { label: merge.label },
          position: {
            x: baseX + NODE_W / 2 + H_GAP / 2,
            y: NODE_H + V_GAP,
          },
          targetPosition: Position.Top,
          style: mergeStyle,
          draggable: false,
          selectable: false,
        })
      }

      pairIndex++
    }
  }

  /* ================= AUTO HEIGHT ================= */

  const canvasHeight = useMemo(() => {
    if (!nodes.length) return 260
    const ys = nodes.map((n) => n.position.y)
    return Math.max(
      Math.max(...ys) - Math.min(...ys) + NODE_H + 80,
      260
    )
  }, [nodes])

  /* ================= EDGES ================= */

  dag.edges.forEach((e, i) => {
    if (e.to === "result") return

    const label =
      e.joinType === "output"
        ? ""
        : `${e.joinType}\n${e.leftKeys.join(",")}=${e.rightKeys.join(",")}`

    edges.push({
      id: `e-${i}`,
      source: e.from,
      target: e.to,
      type: "centered",
      animated: false,
      label,
      labelStyle: {
        fontSize: 11,
        whiteSpace: "pre-line",
      },
      style: {
        strokeWidth: 2,
        stroke: "#9ca3af",
      },
    })
  })

  useEffect(() => {
    rfInstance.current?.fitView({ padding: 0.25 })
  }, [dag])

  return (
    <div style={{ height: canvasHeight }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        edgeTypes={edgeTypes}
        onInit={(i) => (rfInstance.current = i)}
        nodesDraggable={false}
        nodesConnectable={false}
        zoomOnScroll={false}
        panOnDrag={false}
      >
        <Background />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  )
}

const sourceStyle = {
  border: "1px solid #e5e7eb",
  borderRadius: 8,
  background: "#ffffff",
}

const mergeStyle = {
  border: "1px solid #ff4b4b",
  borderRadius: 8,
  background: "#fff5f5",
  fontWeight: 600,
}
