import "./styles.css"
import React from "react"
import ReactDOM from "react-dom/client"
import { withStreamlitConnection } from "streamlit-component-lib"
import MergeTables from "./MergeTables"

const Connected = withStreamlitConnection(MergeTables)

ReactDOM.createRoot(document.getElementById("root")!).render(
  <Connected />
)
