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

interface State {
  tableCount: number
  mergeSteps: MergeStep[]
  mergeMode: "chain" | "pairwise"
}

class MergeTables extends StreamlitComponentBase<State> {
  private emitTimer: number | null = null
  state: State = {
    tableCount: 2,
    mergeSteps: [],
    mergeMode: "chain",
  }

  /* ===================== lifecycle ===================== */

  componentDidMount() {
    this.hydrateFromValue()
    this.initializeStepsIfNeeded()
    this.emitIfValid(0)
    Streamlit.setFrameHeight()
  }

  componentDidUpdate(prevProps: any, prevState: State) {
    if (this.props.args?.value !== prevProps.args?.value) {
      this.hydrateFromValue()
    }

    const tableCountChanged =
      prevState.tableCount !== this.state.tableCount
    const tablesChanged =
      prevProps.args?.tables !== this.props.args?.tables
    const mergeModeChanged =
      prevState.mergeMode !== this.state.mergeMode

    if (tableCountChanged || tablesChanged || mergeModeChanged) {
      this.initializeStepsIfNeeded()
    }

    Streamlit.setFrameHeight()
  }

  /* ===================== hydration ===================== */

  hydrateFromValue() {
    const incoming = this.props.args?.value
    if (incoming?.steps) {
      this.setState({
        mergeSteps: incoming.steps,
        mergeMode: incoming.mode || this.state.mergeMode,
        tableCount: Math.max(
          incoming.steps.length + 1,
          this.state.tableCount
        ),
      })
    }
  }

  /* ===================== initialize ===================== */

  initializeStepsIfNeeded() {
    if (this.props.args?.value?.steps?.length) return

    const tables: TableMeta[] = Array.isArray(this.props.args?.tables)
      ? this.props.args.tables
      : []

    if (tables.length < 2) return

    const safeCount = Math.min(this.state.tableCount, tables.length)
    const steps: MergeStep[] = []

    if (this.state.mergeMode === "chain") {
      for (let i = 0; i < safeCount - 1; i++) {
        steps.push({
          leftTableId: tables[i].id,
          rightTableId: tables[i + 1].id,
          leftKeys: [],
          rightKeys: [],
          joinType: "inner",
        })
      }
    } else {
      for (let i = 0; i < safeCount; i += 2) {
        if (i + 1 < safeCount) {
          steps.push({
            leftTableId: tables[i].id,
            rightTableId: tables[i + 1].id,
            leftKeys: [],
            rightKeys: [],
            joinType: "inner",
          })
        }
      }
    }

    this.setState({ mergeSteps: steps })
  }

  /* ===================== update ===================== */

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

  /* ===================== emit ===================== */

  emitIfValid(delay = 400) {
    const validation = this.validateMergeSteps()
    if (!validation.valid) return

    // clear previous timer
    if (this.emitTimer) {
      window.clearTimeout(this.emitTimer)
    }

    this.emitTimer = window.setTimeout(() => {
      Streamlit.setComponentValue({
        mode: this.state.mergeMode,
        steps: this.state.mergeSteps,
      })
      this.emitTimer = null
    }, delay)
  }


  /* ===================== validation ===================== */

  validateMergeSteps() {
    const { mergeSteps, mergeMode } = this.state
    if (!mergeSteps.length)
      return { valid: false, reason: "No steps" }

    for (let i = 0; i < mergeSteps.length; i++) {
      const s = mergeSteps[i]

      if (
        !s.leftKeys.length ||
        !s.rightKeys.length ||
        s.leftKeys.length !== s.rightKeys.length
      ) {
        return {
          valid: false,
          reason: `Step ${i + 1}: join keys invalid`,
        }
      }

      if (mergeMode === "chain" && i > 0 && !s.rightKeys.length) {
        return {
          valid: false,
          reason: `Step ${i + 1}: right join keys required`,
        }
      }
    }

    return { valid: true }
  }

  /* ===================== render ===================== */

  render() {
    const tables: TableMeta[] = Array.isArray(this.props.args?.tables)
      ? this.props.args.tables
      : []

    if (tables.length < 2) {
      return <div style={{ padding: 16 }}>Loading tables…</div>
    }

    // only tables actually used
    const usedTableIds = new Set<string>()
    this.state.mergeSteps.forEach((s) => {
      if (s.leftTableId) usedTableIds.add(s.leftTableId)
      if (s.rightTableId) usedTableIds.add(s.rightTableId)
    })
    const usedTables = tables.filter((t) =>
      usedTableIds.has(t.id)
    )

    const dag = buildMergeDAG(
      usedTables,
      this.state.mergeSteps,
      this.state.mergeMode,
      this.props.args?.stats || []
    )

    const showDAG = Boolean(this.props.args?.dag)

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
                  this.setState(
                    { tableCount: Number(e.target.value) },
                    () => this.emitIfValid()
                  )
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
                  this.setState(
                    {
                      mergeMode: e.target.value as
                        | "chain"
                        | "pairwise",
                    },
                    () => this.emitIfValid()
                  )
                }
              >
                <option value="chain">Chain</option>
                <option value="pairwise">Pairwise</option>
              </select>
            </label>
          </div>
        </div>

        {/* ---------- Merge Flow ---------- */}
        <div className="merge-canvas">
          <div className="merge-flow">
            {this.state.mergeSteps.map((step, idx) => (
              <React.Fragment key={idx}>
                <TableCard
                  tables={tables}
                  selectedTableId={step.leftTableId}
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

                {this.state.mergeMode === "chain" &&
                  idx ===
                    this.state.mergeSteps.length - 1 && (
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
                        this.updateStep(idx, {
                          rightKeys: keys,
                        })
                      }
                    />
                  )}

                {this.state.mergeMode === "pairwise" && (
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
                      this.updateStep(idx, {
                        rightKeys: keys,
                      })
                    }
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* ---------- DAG ---------- */}
        {showDAG && (
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
