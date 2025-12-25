import os
import streamlit.components.v1 as components

_RELEASE = True
__version__ = "0.1.0"

if _RELEASE:
    parent_dir = os.path.dirname(os.path.abspath(__file__))
    build_dir = os.path.join(parent_dir, "frontend")

    _merge_tables = components.declare_component(
        "merge_tables",
        path=build_dir,
    )
else:
    _merge_tables = components.declare_component(
        "merge_tables",
        url="http://localhost:5173",
    )


def merge_tables(tables, dag=False, value=None, key=None):
    """
    tables: List[dict] -> table metadata
    dag: bool -> show DAG or not
    value: dict -> previous merge plan (for rehydration)
    """
    return _merge_tables(
        tables=tables,
        dag=dag,
        # value=value,
        key=key,
    )

