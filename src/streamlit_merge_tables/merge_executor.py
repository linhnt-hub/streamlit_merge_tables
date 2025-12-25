
import pandas as pd

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
