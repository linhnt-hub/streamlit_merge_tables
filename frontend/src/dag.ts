// frontend/src/dag.ts

export type DAGNodeType = "source" | "merge" | "result"

export interface DAGNode {
  id: string
  label: string
  type: DAGNodeType
}

export interface DAGEdge {
  from: string
  to: string
  joinType: string
  leftKeys: string[]
  rightKeys: string[]
}

export interface MergeDAG {
  mode: "chain" | "pairwise"
  nodes: DAGNode[]
  edges: DAGEdge[]
}

export function buildMergeDAG(
  tables: { id: string; name: string }[],
  mergeSteps: any[],
  mode: "chain" | "pairwise"
): MergeDAG {
  const nodes: DAGNode[] = []
  const edges: DAGEdge[] = []

  tables.forEach((t) =>
    nodes.push({ id: t.id, label: t.name, type: "source" })
  )

  if (mode === "chain") {
    let prevMergeId: string | null = null

    mergeSteps.forEach((step, idx) => {
      const mergeId = `merge_${idx + 1}`

      nodes.push({
        id: mergeId,
        label: `Merge ${idx + 1}`,
        type: "merge",
      })

      if (idx === 0) {
        edges.push({
          from: step.leftTableId,
          to: mergeId,
          joinType: step.joinType,
          leftKeys: step.leftKeys,
          rightKeys: step.rightKeys,
        })
        edges.push({
          from: step.rightTableId,
          to: mergeId,
          joinType: step.joinType,
          leftKeys: step.leftKeys,
          rightKeys: step.rightKeys,
        })
      } else {
        edges.push({
          from: prevMergeId!,
          to: mergeId,
          joinType: step.joinType,
          leftKeys: [],
          rightKeys: [],
        })
        edges.push({
          from: step.rightTableId,
          to: mergeId,
          joinType: step.joinType,
          leftKeys: step.leftKeys,
          rightKeys: step.rightKeys,
        })
      }

      prevMergeId = mergeId
    })

    if (mergeSteps.length) {
      nodes.push({ id: "result", label: "Result", type: "result" })
      edges.push({
        from: `merge_${mergeSteps.length}`,
        to: "result",
        joinType: "output",
        leftKeys: [],
        rightKeys: [],
      })
    }
  }

  if (mode === "pairwise") {
    let idx = 0
    mergeSteps.forEach((s) => {
      idx++
      const mergeId = `merge_${idx}`
      nodes.push({ id: mergeId, label: `Merge ${idx}`, type: "merge" })
      edges.push({
        from: s.leftTableId,
        to: mergeId,
        joinType: s.joinType,
        leftKeys: s.leftKeys,
        rightKeys: s.rightKeys,
      })
      edges.push({
        from: s.rightTableId,
        to: mergeId,
        joinType: s.joinType,
        leftKeys: s.leftKeys,
        rightKeys: s.rightKeys,
      })
    })

    if (idx) {
      nodes.push({ id: "result", label: "Result", type: "result" })
      edges.push({
        from: `merge_${idx}`,
        to: "result",
        joinType: "output",
        leftKeys: [],
        rightKeys: [],
      })
    }
  }

  return { mode, nodes, edges }
}
