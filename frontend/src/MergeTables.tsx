import React from "react"
import {
  Streamlit,
  StreamlitComponentBase,
  withStreamlitConnection,
} from "streamlit-component-lib"
import { TableMeta, MergeStep, JoinType } from "./types"
import TableCard from "./components/TableCard"
import JoinConnector from "./components/JoinConnector"
import MergeDAGView from "./components/MergeDAGView"
import { buildMergeDAG } from "./dag"

/* ================= helpers ================= */

function autoTitle(id: string) {
  return id
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function mergeColumns(
  leftCols: string[],
  rightCols: string[],
  rightPrefix: string
): string[] {
  const leftSet = new Set(leftCols)
  const merged = [...leftCols]

  rightCols.forEach((col) => {
    if (leftSet.has(col)) merged.push(`${rightPrefix}.${col}`)
    else merged.push(col)
  })

  return merged
}

function areKeyTypesCompatible(
  left?: TableMeta,
  right?: TableMeta,
  leftKeys: string[] = [],
  rightKeys: string[] = []
): boolean {
  if (!left?.dtypes || !right?.dtypes) return true
  if (leftKeys.length !== rightKeys.length) return true

  return leftKeys.every(
    (lk, i) => left.dtypes![lk] === right.dtypes![rightKeys[i]]
  )
}

/* ===== auto-suggest join key ===== */

function suggestJoinKeys(
  left?: TableMeta,
  right?: TableMeta
): { left: string[]; right: string[] } | null {
  if (!left || !right) return null

  const common = left.columns.filter((c) =>
    right.columns.includes(c)
  )
  if (!common.length) return null

  if (left.dtypes && right.dtypes) {
    const match = common.find(
      (c) => left.dtypes![c] === right.dtypes![c]
    )
    if (match) return { left: [match], right: [match] }
  }

  return { left: [common[0]], right: [common[0]] }
}

/* ================= state ================= */

interface State {
  mergeSteps: MergeStep[]
  mergeMode: "chain" | "pairwise"
}

/* ================= component ================= */

class MergeTables extends StreamlitComponentBase<State> {
  private emitTimer: number | null = null

  state: State = {
    mergeSteps: [],
    mergeMode: "chain",
  }

  /* ================= lifecycle ================= */

  componentDidMount() {
    Streamlit.setFrameHeight()
  }

  componentDidUpdate() {
    Streamlit.setFrameHeight()
  }

  /* ================= tables ================= */

  getTables(): TableMeta[] {
    if (Array.isArray(this.props.args?.tables)) {
      return this.props.args.tables
    }

    const dfs = this.props.args?.dataframes
    if (!dfs || typeof dfs !== "object") return []

    const names = this.props.args?.table_names ?? {}

    return Object.entries(dfs).map(([id, df]: any) => ({
      id,
      name: names[id] ?? autoTitle(id),
      columns: Array.isArray(df.columns) ? df.columns : [],
      dtypes: df.dtypes ?? {},
    }))
  }

  /* ================= merge step control ================= */

  addMergeStep = () => {
    const tables = this.getTables()
    if (!tables.length) return

    this.setState(
      (prev) => ({
        mergeSteps: [
          ...prev.mergeSteps,
          {
            leftTableId:
              prev.mergeMode === "chain" && prev.mergeSteps.length > 0
                ? `merge_${prev.mergeSteps.length}`
                : tables[0].id,
            rightTableId: tables[0].id,
            leftKeys: [],
            rightKeys: [],
            joinType: "inner",
          },
        ],
      }),
      () => this.emitIfValid()
    )
  }

  removeMergeStep = (index: number) => {
    this.setState(
      (prev) => ({
        mergeSteps: prev.mergeSteps.filter((_, i) => i !== index),
      }),
      () => this.emitIfValid()
    )
  }

  updateStep = (index: number, patch: Partial<MergeStep>) => {
    this.setState(
      (prev) => ({
        mergeSteps: prev.mergeSteps.map((s, i) =>
          i === index ? { ...s, ...patch } : s
        ),
      }),
      () => this.emitIfValid()
    )
  }

  /* ================= validation ================= */

  validateMergeSteps(tables: TableMeta[]) {
    for (const s of this.state.mergeSteps) {
      const left = tables.find((t) => t.id === s.leftTableId)
      const right = tables.find((t) => t.id === s.rightTableId)

      if (!s.leftKeys.length || !s.rightKeys.length) return false
      if (s.leftKeys.length !== s.rightKeys.length) return false
      if (!areKeyTypesCompatible(left, right, s.leftKeys, s.rightKeys))
        return false
    }
    return true
  }

  /* ================= emit ================= */

  emitIfValid(delay = 300) {
    const tables = this.getTables()
    if (!this.validateMergeSteps(tables)) return

    if (this.emitTimer) window.clearTimeout(this.emitTimer)

    this.emitTimer = window.setTimeout(() => {
      const steps =
        this.state.mergeMode === "chain"
          ? this.state.mergeSteps.map((s, idx) =>
              idx === 0 ? s : { ...s, leftTableId: `merge_${idx}` }
            )
          : this.state.mergeSteps

      Streamlit.setComponentValue({
        mode: this.state.mergeMode,
        steps,
      })

      this.emitTimer = null
    }, delay)
  }

  /* ================= render ================= */

  render() {
    const tables = this.getTables()
    const enableDag =
      typeof this.props.args?.dag === "boolean"
        ? this.props.args.dag
        : true

    if (!tables.length) {
      return <div style={{ padding: 16 }}>Loading tables…</div>
    }

    /* ---------- build merge result tables ---------- */

    const mergeTables: TableMeta[] = []

    this.state.mergeSteps.forEach((step, idx) => {
      const left =
        this.state.mergeMode === "chain" && idx > 0
          ? mergeTables[idx - 1]
          : tables.find((t) => t.id === step.leftTableId)

      const right = tables.find((t) => t.id === step.rightTableId)

      if (left && right) {
        mergeTables.push({
          id: `merge_${idx + 1}`,
          name: `Merge ${idx + 1}`,
          columns: mergeColumns(left.columns, right.columns, right.name),
          dtypes: {},
        })
      }
    })

    const dag = buildMergeDAG(
      tables,
      this.state.mergeSteps,
      this.state.mergeMode
    )

    return (
      <div className="merge-root">
        {/* ---------- Toolbar ---------- */}
        <div className="merge-toolbar-wrapper">
          <div className="merge-toolbar">
            <button
              className="toolbar-button"
              onClick={this.addMergeStep}
            >
              + Add
            </button>

            <label className="toolbar-field">
              <span className="toolbar-label">Mode</span>
              <select
                className="toolbar-select"
                value={this.state.mergeMode}
                onChange={(e) =>
                  this.setState({
                    mergeMode: e.target.value as
                      | "chain"
                      | "pairwise",
                  })
                }
              >
                <option value="chain">Chain</option>
                <option value="pairwise">Pairwise</option>
              </select>
            </label>
          </div>
        </div>

        {/* ---------- MERGE STEPS ---------- */}
        <div
          className="merge-flow"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 32,
            marginTop: 16,
          }}
        >
          {this.state.mergeSteps.map((step, idx) => {
            const lockLeft =
              this.state.mergeMode === "chain" && idx > 0

            const leftTable = lockLeft
              ? mergeTables[idx - 1]
              : tables.find((t) => t.id === step.leftTableId)

            const rightTable = tables.find(
              (t) => t.id === step.rightTableId
            )

            if (!leftTable) return null

            const suggestion =
              !step.leftKeys.length &&
              !step.rightKeys.length
                ? suggestJoinKeys(leftTable, rightTable)
                : null

            return (
              <div
                key={idx}
                style={{
                  padding: 16,
                  borderRadius: 12,
                  border: "1px solid #e5e7eb",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 12,
                    fontWeight: 600,
                  }}
                >
                  <div className="merge-header">
                    <div className="merge-title">
                      <span>Merge</span>
                      <span className="merge-index">{idx + 1}</span>
                    </div>
                    <button
                      className="merge-remove"
                      onClick={() => this.removeMergeStep(idx)}
                    >
                      x
                    </button>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 20 }}>
                  <TableCard
                    tables={lockLeft ? [leftTable] : tables}
                    selectedTableId={leftTable.id}
                    disabledTableSelect={lockLeft}
                    selectedKeys={step.leftKeys}
                    onTableChange={(id) =>
                      this.updateStep(idx, {
                        leftTableId: id,
                        leftKeys: [],
                      })
                    }
                    onKeysChange={(keys) =>
                      this.updateStep(idx, { leftKeys: keys })
                    }
                  />

                  <JoinConnector
                    joinType={step.joinType}
                    onChange={(t: JoinType) =>
                      this.updateStep(idx, { joinType: t })
                    }
                  />

                  <TableCard
                    tables={tables}
                    selectedTableId={step.rightTableId}
                    selectedKeys={step.rightKeys}
                    onTableChange={(id) =>
                      this.updateStep(idx, {
                        rightTableId: id,
                        rightKeys: [],
                      })
                    }
                    onKeysChange={(keys) =>
                      this.updateStep(idx, { rightKeys: keys })
                    }
                  />
                </div>

                {suggestion && (
                  <div
                    style={{
                      marginTop: 8,
                      fontSize: 12,
                      color: "#0369a1",
                      cursor: "pointer",
                    }}
                    onClick={() =>
                      this.updateStep(idx, {
                        leftKeys: suggestion.left,
                        rightKeys: suggestion.right,
                      })
                    }
                  >
                    Suggested join key: <b>{suggestion.left[0]}</b>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {enableDag && (
          <div style={{ marginTop: 24 }}>
            <h4>DAG</h4>
            <MergeDAGView dag={dag} />
          </div>
        )}
      </div>
    )
  }
}

export default withStreamlitConnection(MergeTables)
