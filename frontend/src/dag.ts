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
  mode: "chain" | "pairwise",
  stats: any[] = []
): MergeDAG {
  const nodes: DAGNode[] = []
  const edges: DAGEdge[] = []

  /* ---------------- SOURCE TABLE NODES ---------------- */
  tables.forEach((t) => {
    nodes.push({
      id: t.id,
      label: t.name,
      type: "source",
    })
  })

  /* =====================================================
     CHAIN MODE – PIPELINE
     ===================================================== */
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
        // Merge1: table + table
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
        // MergeN: previous merge + next table
        edges.push({
          from: prevMergeId!,
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
      }

      prevMergeId = mergeId
    })

    /* -------- RESULT NODE -------- */
    if (mergeSteps.length > 0) {
      const resultId = "result"

      nodes.push({
        id: resultId,
        label: "Result",
        type: "result",
      })

      edges.push({
        from: `merge_${mergeSteps.length}`,
        to: resultId,
        joinType: "output",
        leftKeys: [],
        rightKeys: [],
      })
    }
  }

  /* =====================================================
     PAIRWISE MODE (KHÔNG THAY ĐỔI LOGIC)
     ===================================================== */
  if (mode === "pairwise") {
    let mergeIndex = 0

    for (let i = 0; i < mergeSteps.length; i++) {
      const step = mergeSteps[i]
      mergeIndex++

      const mergeId = `merge_${mergeIndex}`

      nodes.push({
        id: mergeId,
        label: `Merge ${mergeIndex}`,
        type: "merge",
      })

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
    }

    if (mergeIndex > 0) {
      nodes.push({
        id: "result",
        label: "Result",
        type: "result",
      })

      edges.push({
        from: `merge_${mergeIndex}`,
        to: "result",
        joinType: "output",
        leftKeys: [],
        rightKeys: [],
      })
    }
  }

  return { mode, nodes, edges }
}
