import React from "react"
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
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
  const nodes: Node[] = []
  const edges: Edge[] = []

  const sourceNodes = dag.nodes.filter(
    (n) => n.type === "source"
  )
  const mergeNodes = dag.nodes.filter(
    (n) => n.type !== "source"
  )

  /* ======================================================
     CHAIN MODE → TOP TO BOTTOM
     ====================================================== */
  if (dag.mode === "chain") {
    // source row
    sourceNodes.forEach((n, i) => {
      nodes.push({
        id: n.id,
        data: { label: n.label },
        position: { x: i * (NODE_W + H_GAP), y: 0 },
        style: sourceStyle,
      })
    })

    // merge stack
    mergeNodes.forEach((n, i) => {
      nodes.push({
        id: n.id,
        data: { label: n.label },
        position: {
          x: NODE_W + H_GAP,
          y: (i + 1) * (NODE_H + V_GAP),
        },
        style: mergeStyle,
      })
    })
  }

  /* ======================================================
     PAIRWISE MODE → 2-COLUMN LAYOUT
     ====================================================== */
  if (dag.mode === "pairwise") {
    let pairIndex = 0

    for (let i = 0; i < sourceNodes.length; i += 2) {
      const left = sourceNodes[i]
      const right = sourceNodes[i + 1]
      const merge = mergeNodes[pairIndex]

      const baseX = pairIndex * (NODE_W * 2 + H_GAP * 2)

      // left source
      nodes.push({
        id: left.id,
        data: { label: left.label },
        position: { x: baseX, y: 0 },
        style: sourceStyle,
      })

      // right source
      if (right) {
        nodes.push({
          id: right.id,
          data: { label: right.label },
          position: { x: baseX + NODE_W + H_GAP, y: 0 },
          style: sourceStyle,
        })
      }

      // merge node
      if (merge) {
        nodes.push({
          id: merge.id,
          data: { label: merge.label },
          position: {
            x: baseX + (NODE_W + H_GAP) / 2,
            y: NODE_H + V_GAP,
          },
          style: mergeStyle,
        })
      }

      pairIndex++
    }
  }

  /* ---------------- EDGES ---------------- */
  dag.edges.forEach((e, i) => {
    edges.push({
      id: `e-${i}`,
      source: e.from,
      target: e.to,
      animated: true,
      label: `${e.joinType}\n${e.leftKeys.join(
        ","
      )} = ${e.rightKeys.join(",")}`,
      style: { strokeWidth: 2 },
    })
  })

  return (
    <div style={{ height: 420 }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        nodesDraggable={false}
        zoomOnScroll={false}
        panOnScroll
      >
        <Background />
        <Controls />
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
