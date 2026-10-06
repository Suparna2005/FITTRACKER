import re
file_path = 'frontend/src/VisionHub.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('gold-text', 'text-[#C7F36B]')
content = re.sub(r'bg-blue-\d{3}(/\d+)?', lambda m: 'bg-[#54D8CF]' + (m.group(1) or ''), content)
content = re.sub(r'text-blue-\d{3}', 'text-[#54D8CF]', content)
content = re.sub(r'border-blue-\d{3}(/\d+)?', lambda m: 'border-[#54D8CF]' + (m.group(1) or ''), content)

content = re.sub(r'bg-emerald-\d{3}(/\d+)?', lambda m: 'bg-[#C7F36B]' + (m.group(1) or ''), content)
content = re.sub(r'text-emerald-\d{3}', 'text-[#C7F36B]', content)
content = re.sub(r'border-emerald-\d{3}(/\d+)?', lambda m: 'border-[#C7F36B]' + (m.group(1) or ''), content)

content = re.sub(r'shadow-\[0_0_\d+px_rgba\(16,185,129,[\d.]+\)\]', '', content)
content = re.sub(r'shadow-\[0_0_\d+px_rgba\(59,130,246,[\d.]+\)\]', '', content)
content = re.sub(r'shadow-\[0_0_20px_4px_rgba\(52,211,153,0\.8\)\]', '', content)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Updated VisionHub')
