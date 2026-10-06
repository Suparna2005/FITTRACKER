import re

file_path = 'frontend/src/App.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

def extract_view(view_name, text):
    pattern = f"  if \\(view === '{view_name}'\\) {{\\s*return \\(\\s*<div className=\"min-h-screen bg-\\[#0B1014\\] text-\\[#F4F7F8\\] p-4 md:p-8\">\\s*<div className=\"max-w-5xl mx-auto fade-up\">\\s*<button onClick={{[^}}]+}}[^>]+>.*?<\\/button>\\s*(.*?)<\\/div>\\s*<\\/div>\\s*\\)\\s*}}"
    match = re.search(pattern, text, re.DOTALL)
    if match:
        body = match.group(1)
        return body, text.replace(match.group(0), "")
    else:
        print(f"Failed to match {view_name}")
    return None, text

profile_body, content = extract_view('profile', content)
input_body, content = extract_view('input', content)
tutorial_body, content = extract_view('tutorial', content)

insertion_point = "{view === 'dashboard' && ("

new_views = ""
if profile_body:
    new_views += f"        {{view === 'profile' && (\n          <div className=\"max-w-5xl mx-auto fade-up\">\n            {profile_body}\n          </div>\n        )}}\n\n"
if input_body:
    new_views += f"        {{view === 'input' && (\n          <div className=\"max-w-5xl mx-auto fade-up\">\n            {input_body}\n          </div>\n        )}}\n\n"
if tutorial_body:
    new_views += f"        {{view === 'tutorial' && (\n          <div className=\"max-w-5xl mx-auto fade-up\">\n            {tutorial_body}\n          </div>\n        )}}\n\n"

content = content.replace(insertion_point, new_views + insertion_point)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Updated views')
