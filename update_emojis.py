file_path = 'frontend/src/App.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

if "import { Activity, Dumbbell, Flame, CheckCircle, Apple, AlertCircle, CalendarDays, BarChart3, Search } from 'lucide-react';" not in content:
    content = content.replace("import React,", "import { Activity, Dumbbell, Flame, CheckCircle, Apple, AlertCircle, CalendarDays, BarChart3, Search } from 'lucide-react';\nimport React,")

content = content.replace('<div className="w-12 h-12 rounded-xl bg-[#10181D] border border-[#304149] flex items-center justify-center text-[#54D8CF] text-xl shrink-0">\n                      🔥\n                    </div>', 
'<div className="w-12 h-12 rounded-xl bg-[#10181D] border border-[#304149] flex items-center justify-center text-[#54D8CF] shrink-0">\n                      <Flame size={24} />\n                    </div>')

content = content.replace('<div className="w-12 h-12 rounded-xl bg-[#10181D] border border-[#304149] flex items-center justify-center text-[#54D8CF] text-xl shrink-0">\n                      🏋️\n                    </div>',
'<div className="w-12 h-12 rounded-xl bg-[#10181D] border border-[#304149] flex items-center justify-center text-[#54D8CF] shrink-0">\n                      <Dumbbell size={24} />\n                    </div>')

content = content.replace('<div className="w-12 h-12 rounded-xl bg-[#10181D] border border-[#304149] flex items-center justify-center text-[#C7F36B] text-xl shrink-0">\n                      ✅\n                    </div>',
'<div className="w-12 h-12 rounded-xl bg-[#10181D] border border-[#304149] flex items-center justify-center text-[#C7F36B] shrink-0">\n                      <CheckCircle size={24} />\n                    </div>')

content = content.replace('<span className="text-lg text-[#54D8CF]">🎯</span>', '<Activity className="text-[#54D8CF]" size={20} />')
content = content.replace('<span className="text-lg text-[#FF897A]">🩺</span>', '<Activity className="text-[#FF897A]" size={20} />')
content = content.replace('<span className="text-lg text-[#FF897A]">📈</span>', '<BarChart3 className="text-[#FF897A]" size={20} />')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Updated emojis')
