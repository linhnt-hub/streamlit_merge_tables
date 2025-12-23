export type JoinType = "inner" | "left" | "right" | "outer"

export interface TableMeta {
  id: string
  name: string
  columns: string[]
}

export interface MergeStep {
  leftTableId: string
  rightTableId: string
  leftKeys: string[]
  rightKeys: string[]
  joinType: JoinType
}

export interface MergePlan {
  steps: MergeStep[]
  saveMode: "final" | "each_step" | "each_table"
}