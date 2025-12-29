# streamlit-merge-tables

`streamlit-merge-tables` is a Streamlit custom component that allows users to visually define merge (join) logic across multiple tables using an interactive UI.

The component does not perform the actual data merge.
Instead, it returns a merge plan (dictionary) describing how tables should be joined, giving developers full control over execution.

---

## Features

- Visual table merge builder
- Chain and pairwise merge modes
- Multiple join types: INNER, LEFT, RIGHT, OUTER
- Column-level join key selection
- Built-in validation
- Optional DAG visualization of merge flow
- Framework-agnostic execution (pandas, SQL, backend services)

---

## Installation

### Install from PyPI
```
pip install streamlit-merge-tables
```
### Install from GitHub
```
git clone https://github.com/linhnt-hub/streamlit-merge-tables.git
cd streamlit-merge-tables
pip install .
```
---

## Quick Start
```
import streamlit as st
import pandas as pd
from streamlit_component import merge_tables

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

merge_plan = merge_tables(
    tables=tables,
    dag=True,
)

st.subheader("Merge plan")
st.json(merge_plan)
```
---

## Tables Schema

The tables parameter defines table metadata only, not actual DataFrames.
```
tables = [
    {
        "id": "interfaces",
        "name": "Interfaces",
        "columns": ["ifname", "speed", "status"],
    }
]
```
---

## Merge Plan Output
```
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
```
---

![Merge UI](doc/images/merge_tables.jpg)
![Merge Plan](doc/images/merge_plan.jpg)

---

## Developer Notes

- This component does not merge data
- It only produces merge logic
- Developers control execution entirely

---

## License

MIT License
