import { TableMeta, MergeStep, JoinType } from "./types"

export interface DagNode {
  id: string
  label: string
  type: "source" | "intermediate" | "final"
}

export interface DagEdge {
  from: string
  to: string
  joinType: JoinType
  leftKeys: string[]
  rightKeys: string[]
}

export interface MergeStat {
  step: number
  rows: number
  left: string
  right: string
}

export interface MergeDAG {
  mode: "chain" | "pairwise"
  nodes: DagNode[]
  edges: DagEdge[]
}


export function buildMergeDAG(
  tables: TableMeta[],
  mergeSteps: MergeStep[],
  mode: "chain",
  stats: MergeStat[] = []
): MergeDAG {
  const nodes: DagNode[] = []
  const edges: DagEdge[] = []

  // ------------------------------
  // SOURCE NODES
  // ------------------------------
  tables.forEach((t) => {
    nodes.push({
      id: t.id,
      label: t.name,
      type: "source",
    })
  })

  // ------------------------------
  // CHAIN MODE
  // ------------------------------
  if (mode === "chain" && mergeSteps.length) {
    let prevNodeId = mergeSteps[0].leftTableId

    mergeSteps.forEach((step, idx) => {
      const outNodeId = `merge_${idx + 1}`
      const stat = stats.find((s) => s.step === idx + 1)

      nodes.push({
        id: outNodeId,
        label: stat
          ? `Merge ${idx + 1} (${stat.rows} rows)`
          : `Merge ${idx + 1}`,
        type: idx === mergeSteps.length - 1 ? "final" : "intermediate",
      })

      edges.push({
        from: prevNodeId,
        to: outNodeId,
        joinType: step.joinType,
        leftKeys: step.leftKeys,
        rightKeys: step.rightKeys,
      })

      edges.push({
        from: step.rightTableId,
        to: outNodeId,
        joinType: step.joinType,
        leftKeys: step.leftKeys,
        rightKeys: step.rightKeys,
      })

      prevNodeId = outNodeId
    })
  }

  return {
    mode,
    nodes,
    edges,
  }

}
