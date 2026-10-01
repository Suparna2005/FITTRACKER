import os
files = [
    "build_check.py", "cat_app.py", "cat_dash.py", "cat_index.py", "cat_vision.py", 
    "check_patch.py", "copy_artifacts.py", "find_jsx.py", "fix_hang.py", 
    "generate_docs.py", "get_equip.py", "get_lines.py", "get_logic.py", 
    "list_jsx.py", "move_vision.py", "move_vision_back.py", "patch_visionhub.py", 
    "powershell.bat", "read_index.py"
]

for f in files:
    try:
        os.remove(f)
        print(f"Deleted {f}")
    except Exception as e:
        print(f"Error deleting {f}: {e}")
