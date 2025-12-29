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

/* ===== GIAI ĐOẠN 2: auto-suggest join key (NHẸ) ===== */

function suggestJoinKeys(
  left?: TableMeta,
  right?: TableMeta
): { left: string[]; right: string[] } | null {
  if (!left || !right) return null

  const common = left.columns.filter((c) =>
    right.columns.includes(c)
  )

  if (!common.length) return null

  // nếu có dtypes thì ưu tiên type match
  if (left.dtypes && right.dtypes) {
    const match = common.find(
      (c) => left.dtypes![c] === right.dtypes![c]
    )
    if (match) {
      return { left: [match], right: [match] }
    }
  }

  // fallback: cùng tên cột
  return { left: [common[0]], right: [common[0]] }
}

/* ================= state ================= */

interface State {
  tableCount: number
  mergeSteps: MergeStep[]
  mergeMode: "chain" | "pairwise"
}

/* ================= component ================= */

class MergeTables extends StreamlitComponentBase<State> {
  private emitTimer: number | null = null

  state: State = {
    tableCount: 2,
    mergeSteps: [],
    mergeMode: "chain",
  }

  /* ================= lifecycle ================= */

  componentDidMount() {
    this.initializeStepsIfNeeded()
    this.emitIfValid(0)
    Streamlit.setFrameHeight()
  }

  componentDidUpdate(prevProps: any, prevState: State) {
    if (
      prevState.tableCount !== this.state.tableCount ||
      prevState.mergeMode !== this.state.mergeMode ||
      prevProps.args !== this.props.args
    ) {
      this.initializeStepsIfNeeded()
    }
    Streamlit.setFrameHeight()
  }

  /* ================= tables ================= */

  getTables(): TableMeta[] {
    // backward compatible
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

  /* ================= initialize ================= */

  initializeStepsIfNeeded() {
    const tables = this.getTables()
    if (tables.length < 2) return

    const requiredSteps =
      Math.min(this.state.tableCount, tables.length) - 1

    this.setState((prev) => {
      let steps = [...prev.mergeSteps]

      while (steps.length < requiredSteps) {
        const i = steps.length
        steps.push({
          leftTableId: tables[i].id,
          rightTableId: tables[i + 1].id,
          leftKeys: [],
          rightKeys: [],
          joinType: "inner",
        })
      }

      if (steps.length > requiredSteps) {
        steps = steps.slice(0, requiredSteps)
      }

      return { mergeSteps: steps }
    })
  }

  /* ================= update ================= */

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
    for (let i = 0; i < this.state.mergeSteps.length; i++) {
      const s = this.state.mergeSteps[i]
      const left = tables.find((t) => t.id === s.leftTableId)
      const right = tables.find((t) => t.id === s.rightTableId)

      if (!s.leftKeys.length || !s.rightKeys.length) {
        return { valid: false }
      }

      if (s.leftKeys.length !== s.rightKeys.length) {
        return { valid: false }
      }

      if (!areKeyTypesCompatible(left, right, s.leftKeys, s.rightKeys)) {
        return { valid: false }
      }
    }

    return { valid: true }
  }

  /* ================= emit ================= */

  emitIfValid(delay = 300) {
    const tables = this.getTables()
    if (!this.validateMergeSteps(tables).valid) return

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

    if (tables.length < 2) {
      return <div style={{ padding: 16 }}>Loading tables…</div>
    }

    /* ---------- build merge-result tables ---------- */
    const mergeTables: TableMeta[] = []

    if (this.state.mergeMode === "chain") {
      this.state.mergeSteps.forEach((step, idx) => {
        const left =
          idx === 0
            ? tables.find((t) => t.id === step.leftTableId)
            : mergeTables[idx - 1]

        const right = tables.find((t) => t.id === step.rightTableId)

        if (left && right) {
          mergeTables.push({
            id: `merge_${idx + 1}`,
            name: `Merge ${idx + 1}`,
            columns: mergeColumns(
              left.columns,
              right.columns,
              right.name
            ),
            dtypes: {},
          })
        }
      })
    }

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
            <label className="toolbar-field">
              <span className="toolbar-label">Tables</span>
              <select
                className="toolbar-select"
                value={this.state.tableCount}
                onChange={(e) =>
                  this.setState({
                    tableCount: Number(e.target.value),
                  })
                }
              >
                {Array.from(
                  { length: tables.length - 1 },
                  (_, i) => i + 2
                ).map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>

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

            const typeMismatch =
              !areKeyTypesCompatible(
                leftTable,
                rightTable,
                step.leftKeys,
                step.rightKeys
              )

            const invalid =
              !step.leftKeys.length ||
              !step.rightKeys.length ||
              step.leftKeys.length !== step.rightKeys.length ||
              typeMismatch

            return (
              <div
                key={idx}
                style={{
                  padding: 16,
                  borderRadius: 12,
                  border: invalid
                    ? "1px solid #fecaca"
                    : "1px solid #e5e7eb",
                  background: invalid ? "#fff1f2" : "#ffffff",
                }}
              >
                <div style={{ marginBottom: 12, fontWeight: 600 }}>
                  Merge {idx + 1}
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
                    tables={tables.filter(
                      (t) => t.id !== leftTable.id
                    )}
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

                {typeMismatch && (
                  <div
                    style={{
                      marginTop: 10,
                      fontSize: 12,
                      color: "#92400e",
                      background: "#fffbeb",
                      border: "1px solid #fde68a",
                      borderRadius: 8,
                      padding: "6px 10px",
                    }}
                  >
                    Selected key columns have incompatible data types
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
