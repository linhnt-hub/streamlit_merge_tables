import streamlit as st

def main():
    import pandas as pd
    from streamlit_component import merge_tables
    from merge_executor import execute_merge_plan
    st.set_page_config(layout="wide")
    st.title("Streamlit Merge Tables")
    # ------------------------------
    # DEMO DATAFRAMES
    # ------------------------------
    dataframes = {
        "interfaces": pd.DataFrame({
            "ifname": ["ge-0/0/0", "ge-0/0/1"],
            "speed": [1000, 1000],
            "status": ["up", "down"],
        }),
        "traffic": pd.DataFrame({
            "ifname": ["ge-0/0/0", "ge-0/0/2"],
            "bps": [1234, 999],
        }),
        "speed": pd.DataFrame({
            "ifname": ["ge-0/0/0"],
            "speed": ['1Gbps'],
        }),
        "errors": pd.DataFrame({
            "ifname": ["ge-0/0/0"],
            "crc": [5],
        }),
        "errors1": pd.DataFrame({
            "ifname": ["ge-0/0/0"],
            "crc": [5],
        }),
        "errors2": pd.DataFrame({
            "ifname": ["ge-0/0/0"],
            "crc": [7],
        }),
    }

    # ------------------------------
    # TABLE METADATA FOR UI
    # ------------------------------
    tables = [
        {
            "id": "interfaces",
            "name": "Interfaces",
            "columns": ["ifname", "speed", "status"],
        },
        {
            "id": "traffic",
            "name": "Traffic",
            "columns": ["ifname", "bps"],
        },
        {
            "id": "speed",
            "name": "Speed",
            "columns": ["ifname", "speed"],
        },
        {
            "id": "errors",
            "name": "Errors",
            "columns": ["ifname", "crc"],
        },
        {
            "id": "errors1",
            "name": "Errors1",
            "columns": ["ifname", "crc"],
        },
        {
            "id": "errors2",
            "name": "Errors2",
            "columns": ["ifname", "crc"],
        },
    ]

    # ------------------------------
    # LOAD MERGE STATS (PREVIEW)
    # ------------------------------
    merge_stats = st.session_state.get("merge_stats", [])
    col1,col2 = st.columns([1,2])
    with col2:
        if "merge_plan" not in st.session_state:
            st.session_state.merge_plan = None
        with st.container(border=True):
            merge_plan = merge_tables(
                tables=tables,
                # tables=serialize_dataframes(dataframes),
                dag=True,
                # value=st.session_state.merge_plan,
                key="merge_ui",
            )
        if merge_plan:
            st.session_state.merge_plan = merge_plan

    st.subheader("Returned Merge Plan")
    # st.write(serialize_dataframes(dataframes))
    if not merge_plan:
        st.info("Chưa có merge plan – hãy chọn table và bấm Save")
    elif "steps" not in merge_plan or not merge_plan["steps"]:
        st.warning("Merge plan chưa hợp lệ")
    else:
        st.json(merge_plan)

        # -------- PREVIEW ROW COUNT --------
        preview = execute_merge_plan(
            dataframes,
            merge_plan,
            preview=True
        )

        st.session_state["merge_stats"] = preview["stats"]

        st.subheader("Final Merged Result")
        result = execute_merge_plan(
            dataframes,
            merge_plan,
            preview=False
        )
        st.dataframe(result["final_df"])
main()