import React from "react"
import {
  Streamlit,
  StreamlitComponentBase,
  withStreamlitConnection,
} from "streamlit-component-lib"
import { TableMeta, MergeStep, JoinType, MergePlan } from "./types"
import TableCard from "./components/TableCard"
import JoinConnector from "./components/JoinConnector"
import FooterActions from "./components/FooterActions"
import MergeDAGView from "./components/MergeDAGView"
import { buildMergeDAG } from "./dag"

interface State {
  tableCount: number
  mergeSteps: MergeStep[]
  mergeMode: "chain" | "pairwise"
}

class MergeTables extends StreamlitComponentBase<State> {
  state: State = {
    tableCount: 2,
    mergeSteps: [],
    mergeMode: "chain",
  }

  /* ---------------- lifecycle ---------------- */

  componentDidMount() {
    this.initializeSteps()
    Streamlit.setFrameHeight()
  }

  componentDidUpdate(prevProps: any, prevState: State) {
    const tableCountChanged =
      prevState.tableCount !== this.state.tableCount

    const tablesChanged =
      prevProps.args?.tables !== this.props.args?.tables

    const mergeModeChanged =
      prevState.mergeMode !== this.state.mergeMode

    if (tableCountChanged || tablesChanged || mergeModeChanged) {
      this.initializeSteps()
    }

    Streamlit.setFrameHeight()
  }

  /* ---------------- initialize steps ---------------- */

  initializeSteps() {
    const args = this.props.args ?? {}
    const tables: TableMeta[] = Array.isArray(args.tables)
      ? args.tables
      : []

    if (tables.length < 2) return

    const safeCount = Math.min(this.state.tableCount, tables.length)

    let steps: MergeStep[] = []

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

  /* ---------------- update step ---------------- */

  updateStep = (index: number, patch: Partial<MergeStep>) => {
    this.setState((prev) => ({
      mergeSteps: prev.mergeSteps.map((s, i) =>
        i === index ? { ...s, ...patch } : s
      ),
    }))
  }

  /* ---------------- emit merge plan ---------------- */

  emitMergePlan = (saveMode: MergePlan["saveMode"]) => {
    Streamlit.setComponentValue({
      mode: this.state.mergeMode,
      steps: this.state.mergeSteps,
      saveMode,
    })
  }

  /* ---------------- validation ---------------- */

  validateMergeSteps() {
    const { mergeSteps, mergeMode } = this.state

    if (!mergeSteps.length) {
      return { valid: false, reason: "No merge steps defined" }
    }

    for (let i = 0; i < mergeSteps.length; i++) {
      const step = mergeSteps[i]

      if (mergeMode === "pairwise") {
        if (
          !step.leftKeys.length ||
          !step.rightKeys.length ||
          step.leftKeys.length !== step.rightKeys.length
        ) {
          return {
            valid: false,
            reason: `Step ${i + 1}: join keys invalid`,
          }
        }
      }

      if (mergeMode === "chain") {
        if (i === 0) {
          if (
            !step.leftKeys.length ||
            !step.rightKeys.length ||
            step.leftKeys.length !== step.rightKeys.length
          ) {
            return {
              valid: false,
              reason: "Step 1: join keys invalid",
            }
          }
        } else {
          if (!step.rightKeys.length) {
            return {
              valid: false,
              reason: `Step ${i + 1}: right join keys required`,
            }
          }
        }
      }
    }

    return { valid: true }
  }

  /* ---------------- render ---------------- */

  render() {
    const args = this.props.args ?? {}
    const tables: TableMeta[] = Array.isArray(args.tables)
      ? args.tables
      : []
    const showDAG = Boolean(this.props.args?.dag)
    if (tables.length < 2) {
      return <div style={{ padding: 16 }}>Loading tables…</div>
    }

    const validation = this.validateMergeSteps()
    const dag = buildMergeDAG(
      tables,
      this.state.mergeSteps,
      this.state.mergeMode,
      args.stats || []
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
                  this.setState({ tableCount: Number(e.target.value) })
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
                    mergeMode: e.target.value as "chain" | "pairwise",
                  })
                }
              >
                <option value="chain">Chain</option>
                <option value="pairwise">Pairwise</option>
              </select>
            </label>
          </div>
        </div>
        <br/>
        <br/>
        {/* ---------- Merge Flow ---------- */}
        <div className="merge-canvas">
          <div className="merge-flow">
            {this.state.mergeSteps.map((step, idx) => {
              if (this.state.mergeMode === "chain") {
                return (
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

                    {idx === this.state.mergeSteps.length - 1 && (
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
                    )}
                  </React.Fragment>
                )
              }

              // ---------- PAIRWISE ----------
              return (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
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
              )
            })}
          </div>
        </div>
        <br/>
        <br/>
        {/* ---------- DAG ---------- */}
        {showDAG && (
          <div style={{ marginTop: 24 }}>
            <h4>DAG</h4>
            <MergeDAGView dag={dag} />
          </div>
        )}
        <br/>
        <br/>
        {/* ---------- Footer ---------- */}
        <FooterActions
          onAction={this.emitMergePlan}
          disabled={!validation.valid}
          reason={validation.reason}
        />
        <br/>
        <br/>
        <br/>
      </div>
    )
  }
}

export default withStreamlitConnection(MergeTables)
