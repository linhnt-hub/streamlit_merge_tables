
import pandas as pd

# def execute_merge_plan(tables: dict, merge_plan: dict):
#     """
#     tables: dict[str, pd.DataFrame]
#       key   = table_id
#       value = DataFrame

#     merge_plan: {
#         "steps": [
#             {
#               "leftTableId": str,
#               "rightTableId": str,
#               "leftKeys": [str],
#               "rightKeys": [str],
#               "joinType": "inner|left|right|outer"
#             }
#         ],
#         "saveMode": "final|each_step|each_table"
#     }

#     return:
#       dict with:
#         - final_df
#         - steps (optional intermediate dfs)
#     """

#     if not merge_plan or "steps" not in merge_plan:
#         raise ValueError("Invalid merge plan")

#     results = {}
#     current_df = None

#     for idx, step in enumerate(merge_plan["steps"]):
#         left_id = step["leftTableId"]
#         right_id = step["rightTableId"]

#         left_df = current_df if current_df is not None else tables[left_id]
#         right_df = tables[right_id]

#         merged = pd.merge(
#             left_df,
#             right_df,
#             how=step["joinType"],
#             left_on=step["leftKeys"],
#             right_on=step["rightKeys"],
#             suffixes=("", f"_{right_id}")
#         )

#         current_df = merged

#         if merge_plan.get("saveMode") in ("each_step", "each_table"):
#             results[f"step_{idx+1}_{left_id}_{right_id}"] = merged.copy()

#     results["final_df"] = current_df
#     return results
def execute_merge_plan(tables: dict, merge_plan: dict, preview=False):
    if not merge_plan or "steps" not in merge_plan:
        raise ValueError("Invalid merge plan")

    results = {}
    stats = []

    current_df = None

    for idx, step in enumerate(merge_plan["steps"]):
        left_df = (
            current_df
            if current_df is not None
            else tables[step["leftTableId"]]
        )
        right_df = tables[step["rightTableId"]]

        merged = left_df.merge(
            right_df,
            how=step["joinType"],
            left_on=step["leftKeys"],
            right_on=step["rightKeys"],
        )

        stats.append({
            "step": idx + 1,
            "rows": len(merged),
            "left": step["leftTableId"],
            "right": step["rightTableId"],
        })

        current_df = merged

        if not preview:
            results[f"step_{idx+1}"] = merged

    results["final_df"] = current_df
    results["stats"] = stats
    return results
