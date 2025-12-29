streamlit-merge-tables is a Streamlit custom component that allows users to visually define merge (join) logic across multiple tables using an interactive UI.

The component does not merge data directly.
Instead, it returns a merge plan (dictionary) describing how tables should be joined, leaving execution fully under developer control.

Features

Visual table merge builder

Chain and pairwise merge modes

Multiple join types: INNER, LEFT, RIGHT, OUTER

Column-level join key selection

Built-in validation

Optional DAG visualization of merge flow

Framework-agnostic merge execution (pandas, SQL, backend APIs)

Installation
From PyPI
pip install streamlit-merge-tables

From GitHub
git clone https://github.com/linhnt-hub/streamlit-merge-tables.git
cd streamlit-merge-tables
pip install .

Quick Start (5-minute example)
import streamlit as st
import pandas as pd
from streamlit_component import merge_tables

# Example data
df_interfaces = pd.DataFrame({
    "ifname": ["ge-0/0/0", "ge-0/0/1"],
    "speed": [1000, 1000],
    "status": ["up", "down"],
})

df_traffic = pd.DataFrame({
    "ifname": ["ge-0/0/0"],
    "bps": [1234],
})

tables = [
    {
        "id": "interfaces",
        "name": "Interfaces",
        "columns": list(df_interfaces.columns),
    },
    {
        "id": "traffic",
        "name": "Traffic",
        "columns": list(df_traffic.columns),
    },
]

merge_plan = merge_tables(tables=tables, dag=True)

st.subheader("Merge plan")
st.json(merge_plan)


At this point:

Users configure merge logic in the UI

merge_plan updates automatically

You decide how and when to execute the merge

Tables Schema
tables = [
    {
        "id": "interfaces",
        "name": "Interfaces",
        "columns": ["ifname", "speed", "status"],
    }
]

Field	Description
id	Unique internal identifier
name	Display name in UI
columns	Column names
Merge Plan Output
{
  "mode": "chain",
  "steps": [
    {
      "leftTableId": "interfaces",
      "rightTableId": "traffic",
      "leftKeys": ["ifname"],
      "rightKeys": ["ifname"],
      "joinType": "inner"
    }
  ]
}

Developer Notes

The component never touches your DataFrames

It only emits merge logic

Perfect for:

pandas merges

SQL JOIN builders

Backend-driven pipelines

No-code / low-code tools

Example: Execute Merge with pandas
result = pd.merge(
    df_interfaces,
    df_traffic,
    left_on=["ifname"],
    right_on=["ifname"],
    how="inner",
)

Screenshots & Demo

Add screenshots or GIFs here for GitHub:

Merge UI overview

Join key selection

DAG visualization

Recommended format:

docs/images/merge-ui.png
docs/images/merge-dag.gif

License

MIT License