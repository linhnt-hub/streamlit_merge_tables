import React, { useEffect, useMemo, useRef } from "react"
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  Position,
  ReactFlowInstance,
} from "reactflow"
import "reactflow/dist/style.css"
import { MergeDAG } from "../dag"
import CenteredBezierEdge from "./CenteredBezierEdge"

/* ================= Layout ================= */

const NODE_W = 160
const NODE_H = 44
const ROW_GAP = 90

const X_LEFT = 0
const X_RIGHT = 220
const X_MERGE = 440

const edgeTypes = {
  centered: CenteredBezierEdge,
}

interface Props {
  dag: MergeDAG
}

export default function MergeDAGView({ dag }: Props) {
  const rf = useRef<ReactFlowInstance | null>(null)

  const nodes: Node[] = []
  const edges: Edge[] = []

  if (dag.mode === "chain") {
    const seen = new Set<string>()

    dag.edges.forEach((e, i) => {
      const stepIndex = Math.floor(i / 2)
      const y = stepIndex * ROW_GAP

      const isLeft = i % 2 === 0
      const sourceX = isLeft ? X_LEFT : X_RIGHT

      if (!seen.has(e.from)) {
        nodes.push({
          id: e.from,
          data: { label: e.from },
          position: { x: sourceX, y },
          sourcePosition: Position.Right,
          style: sourceStyle,
          draggable: false,
          selectable: false,
        })
        seen.add(e.from)
      }

      if (!seen.has(e.to)) {
        nodes.push({
          id: e.to,
          data: { label: e.to },
          position: { x: X_MERGE, y },
          targetPosition: Position.Left,
          sourcePosition: Position.Right,
          style: mergeStyle,
          draggable: false,
          selectable: false,
        })
        seen.add(e.to)
      }

      edges.push({
        id: `e-${i}`,
        source: e.from,
        target: e.to,
        type: "default",
        label: `${e.joinType}\n${e.leftKeys.join(
          ","
        )} = ${e.rightKeys.join(",")}`,
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
  }
  if (dag.mode === "pairwise") {
    const PAIR_GAP_X = 360
    const PAIR_GAP_Y = 160

    let pairIndex = 0

    for (let i = 0; i < dag.edges.length; i += 2) {
      const leftEdge = dag.edges[i]
      const rightEdge = dag.edges[i + 1]
      if (!rightEdge) break

      const baseX = pairIndex * PAIR_GAP_X
      const yTop = 0
      const yMerge = 80

      // LEFT SOURCE
      nodes.push({
        id: leftEdge.from,
        data: { label: leftEdge.from },
        position: { x: baseX, y: yTop },
        sourcePosition: Position.Bottom,
        style: sourceStyle,
        draggable: false,
        selectable: false,
      })

      // RIGHT SOURCE
      nodes.push({
        id: rightEdge.from,
        data: { label: rightEdge.from },
        position: { x: baseX + 160, y: yTop },
        sourcePosition: Position.Bottom,
        style: sourceStyle,
        draggable: false,
        selectable: false,
      })

      // MERGE
      nodes.push({
        id: leftEdge.to,
        data: { label: leftEdge.to },
        position: { x: baseX + 80, y: yMerge },
        targetPosition: Position.Top,
        style: mergeStyle,
        draggable: false,
        selectable: false,
      })

      // EDGES
      edges.push(
        {
          id: `e-p-${i}`,
          source: leftEdge.from,
          target: leftEdge.to,
          type: "default",
          label: `${leftEdge.joinType}\n${leftEdge.leftKeys.join(
            ","
          )} = ${leftEdge.rightKeys.join(",")}`,
        },
        {
          id: `e-p-${i + 1}`,
          source: rightEdge.from,
          target: rightEdge.to,
          type: "default",
          label: `${rightEdge.joinType}\n${rightEdge.leftKeys.join(
            ","
          )} = ${rightEdge.rightKeys.join(",")}`,
        }
      )

      pairIndex++
    }
  }

  /* ================= Auto height ================= */

  const height = useMemo(() => {
    if (!nodes.length) return 240
    const ys = nodes.map((n) => n.position.y)
    return Math.max(Math.max(...ys) + NODE_H + 60, 240)
  }, [nodes])

  useEffect(() => {
    if (!rf.current || nodes.length === 0) return

    requestAnimationFrame(() => {
      rf.current!.fitView({
        padding: 0.25,
        duration: 400,
      })
    })
  }, [nodes.length, edges.length])

  return (
    <div style={{ height }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        edgeTypes={edgeTypes}
        onInit={(i) => (rf.current = i)}
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

/* ================= Styles ================= */

const sourceStyle = {
  border: "1px solid #e5e7eb",
  borderRadius: 8,
  background: "#ffffff",
  fontSize: 12,
}

const mergeStyle = {
  border: "1px solid #ef4444",
  borderRadius: 8,
  background: "#fff5f5",
  fontWeight: 600,
  fontSize: 12,
}
