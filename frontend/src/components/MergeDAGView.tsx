import React, { useEffect, useRef } from "react"
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

interface Props {
  dag: MergeDAG
}

const NODE_W = 160
const NODE_H = 48
const H_GAP = 80
const V_GAP = 90

export default function MergeDAGView({ dag }: Props) {
  const rfInstance = useRef<ReactFlowInstance | null>(null)

  const nodes: Node[] = []
  const edges: Edge[] = []

  const sourceNodes = dag.nodes.filter(
    (n) => n.type === "source"
  )
  const mergeNodes = dag.nodes.filter(
    (n) => n.type === "merge"
  )

  /* ======================================================
     CHAIN MODE → LEFT TO RIGHT
     ====================================================== */
  if (dag.mode === "chain") {
    // Stack source tables vertically
    sourceNodes.forEach((n, i) => {
      nodes.push({
        id: n.id,
        data: { label: n.label },
        position: {
          x: 0,
          y: i * (NODE_H + V_GAP),
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Right,
        style: sourceStyle,
        draggable: false,
        selectable: false,
      })
    })

    // Center merge nodes vertically relative to tables
    const centerY =
      sourceNodes.length > 1
        ? ((sourceNodes.length - 1) *
            (NODE_H + V_GAP)) /
          2
        : 0

    mergeNodes.forEach((n, i) => {
      nodes.push({
        id: n.id,
        data: { label: n.label },
        position: {
          x: (i + 1) * (NODE_W + H_GAP),
          y: centerY,
        },
        targetPosition: Position.Left,
        sourcePosition: Position.Right,
        style: mergeStyle,
        draggable: false,
        selectable: false,
      })
    })
  }

  /* ======================================================
     PAIRWISE MODE → 2-COLUMN LAYOUT (LEFT → RIGHT)
     ====================================================== */
  if (dag.mode === "pairwise") {
    let pairIndex = 0

    for (let i = 0; i < sourceNodes.length; i += 2) {
      const left = sourceNodes[i]
      const right = sourceNodes[i + 1]
      const merge = mergeNodes[pairIndex]

      const baseX =
        pairIndex * (NODE_W * 2 + H_GAP * 2)

      // Left table
      nodes.push({
        id: left.id,
        data: { label: left.label },
        position: { x: baseX, y: 0 },
        sourcePosition: Position.Bottom,
        targetPosition: Position.Bottom,
        style: sourceStyle,
        draggable: false,
        selectable: false,
      })

      // Right table
      if (right) {
        nodes.push({
          id: right.id,
          data: { label: right.label },
          position: {
            x: baseX + NODE_W + H_GAP,
            y: 0,
          },
          sourcePosition: Position.Bottom,
          targetPosition: Position.Bottom,
          style: sourceStyle,
          draggable: false,
          selectable: false,
        })
      }

      // Merge node (centered between pair)
      if (merge) {
        nodes.push({
          id: merge.id,
          data: { label: merge.label },
          position: {
            x: baseX + (NODE_W + H_GAP) / 2,
            y: NODE_H + V_GAP,
          },
          style: mergeStyle,
          draggable: false,
          selectable: false,
        })
      }

      pairIndex++
    }
  }

  /* ---------------- EDGES ---------------- */
  dag.edges.forEach((e, i) => {
    const keyLabel =
      e.leftKeys?.length && e.rightKeys?.length
        ? `${e.leftKeys.join(", ")} = ${e.rightKeys.join(", ")}`
        : ""

    edges.push({
      id: `e-${i}`,
      source: e.from,
      target: e.to,

      // 🔑 EDGE THẲNG
      // type: "straight",
      type: "default",

      // 🔑 LABEL HIỂN THỊ ĐỦ
      label: `${e.joinType}${keyLabel ? "\n" + keyLabel : ""}`,
      labelStyle: {
        fontSize: 11,
        fill: "#374151",
        whiteSpace: "pre-line",
      },
      labelBgPadding: [6, 4],
      labelBgBorderRadius: 6,
      labelBgStyle: {
        fill: "#ffffff",
        fillOpacity: 0.9,
      },
      animated: true,
      style: {
        strokeWidth: 1,
        stroke: "#9ca3af",
      },
    })
  })


  /* ---------------- AUTO FIT VIEW ---------------- */
  useEffect(() => {
    if (rfInstance.current) {
      setTimeout(() => {
        rfInstance.current?.fitView({ padding: 0.25 })
      }, 50)
    }
  }, [dag])

  return (
    <div style={{ height: 420, marginBottom: 16 }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onInit={(instance) => {
          rfInstance.current = instance
          instance.fitView({ padding: 0.25 })
        }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
        panOnScroll={false}
        panOnDrag={false}
        preventScrolling={true}
      >
        <Background />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  )
}

/* ---------------- STYLES ---------------- */

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
