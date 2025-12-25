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

  const sourceNodes = dag.nodes.filter((n) => n.type === "source")
  const mergeNodes = dag.nodes.filter((n) => n.type === "merge")
  const resultNode = dag.nodes.find((n) => n.type === "result")

  /* ======================================================
     CHAIN MODE – LEFT → RIGHT
     ====================================================== */
  if (dag.mode === "chain") {
    // Sources
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

    // Merges
    mergeNodes.forEach((n, i) => {
      nodes.push({
        id: n.id,
        data: { label: n.label },
        position: {
          x: (i + 1) * (NODE_W + H_GAP),
          y: i * (NODE_H + V_GAP),
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        style: mergeStyle,
        draggable: false,
        selectable: false,
      })
    })

    // Result
    if (resultNode) {
      nodes.push({
        id: resultNode.id,
        data: { label: resultNode.label },
        position: {
          x: (mergeNodes.length + 1) * (NODE_W + H_GAP),
          y:
            ((mergeNodes.length - 1) * (NODE_H + V_GAP)) /
            2,
        },
        targetPosition: Position.Left,
        style: resultStyle,
        draggable: false,
        selectable: false,
      })
    }
  }

  /* ---------------- EDGES ---------------- */
  dag.edges.forEach((e, i) => {
    const label =
      e.joinType === "output"
        ? "output"
        : `${e.joinType}\n${e.leftKeys.join(",")}=${e.rightKeys.join(",")}`

    edges.push({
      id: `e-${i}`,
      source: e.from,
      target: e.to,
      type: "default",
      label,
      labelStyle: {
        fontSize: 11,
        whiteSpace: "pre-line",
      },
      animated: true,
      style: {
        strokeWidth: 2,
        stroke:
          e.joinType === "output" ? "#10b981" : "#9ca3af",
      },
    })
  })

  useEffect(() => {
    if (rfInstance.current) {
      rfInstance.current.fitView({ padding: 0.25 })
    }
  }, [dag])

  return (
    <div style={{ height: 420 }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onInit={(inst) => {
          rfInstance.current = inst
          inst.fitView({ padding: 0.25 })
        }}
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

/* ================= STYLES ================= */

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

const resultStyle = {
  border: "2px solid #10b981",
  borderRadius: 999,
  background: "#ecfdf5",
  fontWeight: 700,
}
