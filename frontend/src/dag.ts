import { TableMeta, MergeStep, JoinType } from "./types"

export interface DagNode {
  id: string
  label: string
  type: "source" | "merge"
}

export interface DagEdge {
  from: string
  to: string
  joinType: JoinType
  leftKeys: string[]
  rightKeys: string[]
}

export interface MergeDAG {
  mode: "chain" | "pairwise"
  nodes: DagNode[]
  edges: DagEdge[]
}

export function buildMergeDAG(
  tables: TableMeta[],
  mergeSteps: MergeStep[],
  mode: "chain" | "pairwise",
  stats: any[] = []
): MergeDAG {
  const nodes: DagNode[] = []
  const edges: DagEdge[] = []

  // ----------------------------
  // SOURCE NODES (only used tables)
  // ----------------------------
  tables.forEach((t) => {
    nodes.push({
      id: t.id,
      label: t.name,
      type: "source",
    })
  })

  // ----------------------------
  // CHAIN MODE
  // ----------------------------
  if (mode === "chain") {
    let prevNodeId: string | null = null

    mergeSteps.forEach((step, idx) => {
      const mergeId = `merge_${idx + 1}`

      nodes.push({
        id: mergeId,
        label: `Merge ${idx + 1}`,
        type: "merge",
      })

      // left
      edges.push({
        from: step.leftTableId,
        to: mergeId,
        joinType: step.joinType,
        leftKeys: step.leftKeys,
        rightKeys: step.rightKeys,
      })

      // right
      edges.push({
        from: step.rightTableId,
        to: mergeId,
        joinType: step.joinType,
        leftKeys: step.leftKeys,
        rightKeys: step.rightKeys,
      })

      // chain dependency
      if (prevNodeId) {
        edges.push({
          from: prevNodeId,
          to: mergeId,
          joinType: step.joinType,
          leftKeys: [],
          rightKeys: [],
        })
      }

      prevNodeId = mergeId
    })
  }

  // ----------------------------
  // PAIRWISE MODE (FIX HERE)
  // ----------------------------
  if (mode === "pairwise") {
    mergeSteps.forEach((step, idx) => {
      const mergeId = `merge_${idx + 1}`

      nodes.push({
        id: mergeId,
        label: `Merge ${idx + 1}`,
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
    })
  }

  return {
    mode,
    nodes,
    edges,
  }
}
