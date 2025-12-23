import os
import streamlit.components.v1 as components

_RELEASE = True

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


def merge_tables(tables, stats=None, dag=False, key=None):
    """
    tables: List[dict]
    stats:  Optional merge preview stats
    dag:    Boolean - show DAG or not
    """
    return _merge_tables(
        tables=tables,
        stats=stats,
        dag=dag,
        key=key,
    )
