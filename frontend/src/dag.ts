import { MergeStep, JoinType } from "./types"

/* ================= Types ================= */

export interface MergeNode {
  id: string
  type: "source" | "merge"
  label: string
}

export interface MergeEdge {
  from: string
  to: string
  joinType: JoinType
  leftKeys: string[]
  rightKeys: string[]
}

export interface MergeDAG {
  mode: "chain" | "pairwise"
  nodes: MergeNode[]
  edges: MergeEdge[]
}

/* ================= Builder ================= */

export function buildMergeDAG(
  tables: { id: string; name: string }[],
  steps: MergeStep[],
  mode: "chain" | "pairwise"
): MergeDAG {
  const nodes: MergeNode[] = []
  const edges: MergeEdge[] = []

  if (mode === "pairwise") {
    steps.forEach((step, idx) => {
      const mergeId = `merge_${idx + 1}`

      nodes.push(
        {
          id: step.leftTableId,
          type: "source",
          label: step.leftTableId,
        },
        {
          id: step.rightTableId,
          type: "source",
          label: step.rightTableId,
        },
        {
          id: mergeId,
          type: "merge",
          label: `Merge ${idx + 1}`,
        }
      )

      edges.push(
        {
          from: step.leftTableId,
          to: mergeId,
          joinType: step.joinType,
          leftKeys: step.leftKeys,
          rightKeys: step.rightKeys,
        },
        {
          from: step.rightTableId,
          to: mergeId,
          joinType: step.joinType,
          leftKeys: step.leftKeys,
          rightKeys: step.rightKeys,
        }
      )
    })

    return { mode, nodes, edges }
  }

  const nodeMap = new Map<string, MergeNode>()

  const getLabel = (id: string) => {
    if (id.startsWith("merge_")) {
      return id.replace("_", " ")
    }
    return tables.find((t) => t.id === id)?.name ?? id
  }

  steps.forEach((step, idx) => {
    const mergeId = `merge_${idx + 1}`

    // ⭐ CORE FIX: effective left
    const leftId =
      idx === 0 ? step.leftTableId : `merge_${idx}`

    const rightId = step.rightTableId

    ;[leftId, rightId, mergeId].forEach((id) => {
      if (!nodeMap.has(id)) {
        nodeMap.set(id, {
          id,
          type: id.startsWith("merge_")
            ? "merge"
            : "source",
          label: getLabel(id),
        })
      }
    })

    edges.push(
      {
        from: leftId,
        to: mergeId,
        joinType: step.joinType,
        leftKeys: step.leftKeys,
        rightKeys: step.rightKeys,
      },
      {
        from: rightId,
        to: mergeId,
        joinType: step.joinType,
        leftKeys: step.leftKeys,
        rightKeys: step.rightKeys,
      }
    )
  })

  return {
    mode,
    nodes: Array.from(nodeMap.values()),
    edges,
  }
}

