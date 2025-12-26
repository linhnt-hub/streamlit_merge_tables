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

/* ================= state ================= */

interface State {
  tableCount: number
  mergeSteps: MergeStep[]
  mergeMode: "chain" | "pairwise"
  activeStepIndex: number | null
}

/* ================= component ================= */

class MergeTables extends StreamlitComponentBase<State> {
  private emitTimer: number | null = null

  state: State = {
    tableCount: 2,
    mergeSteps: [],
    mergeMode: "chain",
    activeStepIndex: null,
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
      prevProps.args?.tables !== this.props.args?.tables
    ) {
      this.initializeStepsIfNeeded()
    }
    Streamlit.setFrameHeight()
  }

  /* ================= initialize ================= */

  initializeStepsIfNeeded() {
    const tables: TableMeta[] = Array.isArray(this.props.args?.tables)
      ? this.props.args.tables
      : []

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

  setActiveStep(index: number) {
    if (this.state.activeStepIndex !== index) {
      this.setState({ activeStepIndex: index })
    }
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

  validateMergeSteps() {
    if (!this.state.mergeSteps.length)
      return { valid: false }

    for (const s of this.state.mergeSteps) {
      if (
        !s.leftKeys.length ||
        !s.rightKeys.length ||
        s.leftKeys.length !== s.rightKeys.length
      ) {
        return { valid: false }
      }
    }
    return { valid: true }
  }

  /* ================= emit ================= */

  emitIfValid(delay = 300) {
    if (!this.validateMergeSteps().valid) return

    if (this.emitTimer) window.clearTimeout(this.emitTimer)

    this.emitTimer = window.setTimeout(() => {
      const steps =
        this.state.mergeMode === "chain"
          ? this.state.mergeSteps.map((s, idx) =>
              idx === 0
                ? s
                : {
                    ...s,
                    leftTableId: `merge_${idx}`,
                  }
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
    const tables: TableMeta[] = Array.isArray(this.props.args?.tables)
      ? this.props.args.tables
      : []

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

        const right = tables.find(
          (t) => t.id === step.rightTableId
        )

        if (left && right) {
          mergeTables.push({
            id: `merge_${idx + 1}`,
            name: `Merge ${idx + 1}`,
            columns: mergeColumns(
              left.columns,
              right.columns,
              right.name
            ),
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
            const leftTable =
              this.state.mergeMode === "chain" && idx > 0
                ? mergeTables[idx - 1]
                : tables.find(
                    (t) => t.id === step.leftTableId
                  )

            if (!leftTable) return null

            const isLeftMergeTable =
              leftTable.id.startsWith("merge_")

            const isActive =
              this.state.activeStepIndex === idx
            const isDimmed =
              this.state.activeStepIndex !== null &&
              this.state.activeStepIndex !== idx

            return (
              <div
                key={idx}
                onClick={() => this.setActiveStep(idx)}
                style={{
                  padding: 16,
                  borderRadius: 12,
                  border: isActive
                    ? "2px solid #3b82f6"
                    : "1px solid #e5e7eb",
                  background: isActive
                    ? "#eff6ff"
                    : "#ffffff",
                  boxShadow: isActive
                    ? "0 10px 28px rgba(59,130,246,0.18)"
                    : "0 1px 3px rgba(0,0,0,0.08)",
                  opacity: isDimmed ? 0.55 : 1,
                  cursor: "pointer",
                  transition: "all 0.18s ease",
                }}
              >
                {/* STEP LABEL */}
                <div
                  style={{
                    marginBottom: 12,
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#374151",
                  }}
                >
                  Merge {idx + 1}
                </div>

                {/* INPUT ROW */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 20,
                  }}
                >
                  {/* LEFT */}
                  <div
                    style={{ flex: 1, minWidth: 0 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <TableCard
                      tables={
                        isLeftMergeTable ? [leftTable] : tables
                      }
                      selectedTableId={leftTable.id}
                      selectedKeys={step.leftKeys}
                      onTableChange={(id) => {
                        if (isLeftMergeTable) return
                        this.setActiveStep(idx)
                        this.updateStep(idx, {
                          leftTableId: id,
                          leftKeys: [],
                        })
                      }}
                      onKeysChange={(keys) => {
                        this.setActiveStep(idx)
                        this.updateStep(idx, {
                          leftKeys: keys,
                        })
                      }}
                    />
                  </div>

                  {/* JOIN */}
                  <div
                    onClick={(e) => e.stopPropagation()}
                  >
                    <JoinConnector
                      joinType={step.joinType}
                      onChange={(t: JoinType) => {
                        this.setActiveStep(idx)
                        this.updateStep(idx, {
                          joinType: t,
                        })
                      }}
                    />
                  </div>

                  {/* RIGHT */}
                  <div
                    style={{ flex: 1, minWidth: 0 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <TableCard
                      tables={tables.filter(
                        (t) => t.id !== leftTable.id
                      )}
                      selectedTableId={step.rightTableId}
                      selectedKeys={step.rightKeys}
                      onTableChange={(id) => {
                        this.setActiveStep(idx)
                        this.updateStep(idx, {
                          rightTableId: id,
                          rightKeys: [],
                        })
                      }}
                      onKeysChange={(keys) => {
                        this.setActiveStep(idx)
                        this.updateStep(idx, {
                          rightKeys: keys,
                        })
                      }}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* ---------- DAG ---------- */}
        <div style={{ marginTop: 24 }}>
          <h4>DAG</h4>
          <MergeDAGView dag={dag} />
        </div>
      </div>
    )
  }
}

export default withStreamlitConnection(MergeTables)
