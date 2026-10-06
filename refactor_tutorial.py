file_path = 'frontend/src/App.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

start_str = "  if (view === 'tutorial') {"
# find the start index
start_idx = content.find(start_str)
if start_idx != -1:
    end_str = "  const needsProfile = !user?.weight || !user?.age"
    end_idx = content.find(end_str)
    
    if end_idx != -1:
        tutorial_block = content[start_idx:end_idx]
        content = content[:start_idx] + content[end_idx:]
        
        # We just want to extract everything inside:
        # <div className="max-w-5xl mx-auto fade-up">
        # ...
        # </div>
        # Actually, let's just find the first <div className="flex items-center justify-between">
        inner_start = tutorial_block.find('          <div className="flex items-center justify-between">')
        # The back button is there. We want everything AFTER the back button wrapper.
        # The wrapper ends at </div> after the button.
        wrapper_end = tutorial_block.find('</div>', inner_start) + 6
        inner_end = tutorial_block.rfind('        </div>\n      </div>\n    )\n  }')
        
        if wrapper_end != -1 and inner_end != -1:
            body = tutorial_block[wrapper_end:inner_end].strip()
            
            insertion_point = "{view === 'dashboard' && ("
            new_views = f"        {{view === 'tutorial' && (\n          <div className=\"max-w-5xl mx-auto fade-up\">\n{body}\n          </div>\n        )}}\n\n"
            content = content.replace(insertion_point, new_views + insertion_point)
            
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print("Success")
        else:
            print("Failed to find inner block")
    else:
        print("Failed to find end str")
else:
    print("Failed to find start str")
