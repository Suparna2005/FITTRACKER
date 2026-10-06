import React, { useState } from 'react'

const MUSCLE_DB = [
  {
    id: "chest",
    name: "Chest (Pectoralis Major)",
    position: "Anterior (front) of the upper chest wall, extending from the sternum to the shoulder.",
    mechanics: "Horizontal adduction and internal rotation. It is responsible for pushing your arms away from your body and hugging motions.",
    training: "To build the chest properly, hit both the upper clavicular head (via incline presses) and lower sternal head (via flat presses and dips). Focus on a deep stretch at the bottom of the movement.",
    exercises: "Incline Bench Press, Flat Dumbbell Press, Cable Crossovers, Dips",
    baseImg: "https://wger.de/static/images/muscles/muscular_system_front.svg",
    muscleImg: "https://wger.de/static/images/muscles/main/muscle-4.svg",
    heads: [
      { name: "Upper Chest (Clavicular Head)", desc: "Builds the 'shelf' near the collarbone.", target: "Incline Bench Press, Low-to-High Crossovers", clip: "polygon(0% 17%, 100% 17%, 100% 21.5%, 0% 21.5%)" },
      { name: "Middle Chest (Sternal Head)", desc: "Provides the main bulk of the pecs.", target: "Flat Bench Press, Pec Deck Flyes", clip: "polygon(0% 21.5%, 100% 21.5%, 100% 25%, 0% 25%)" },
      { name: "Lower Chest (Abdominal Head)", desc: "Develops the lower sweep and defined bottom edge.", target: "Chest Dips, High-to-Low Cable Crossovers, Decline Press", clip: "polygon(0% 25%, 100% 25%, 100% 29.5%, 0% 29.5%)" }
    ]
  },
  {
    id: "back",
    name: "Back (Lats & Traps)",
    position: "Posterior (back) of the torso, spanning from the lower spine up to the humerus (upper arm).",
    mechanics: "Shoulder extension and adduction. Pulls arms down from above head or pulls objects toward torso.",
    training: "Building a wide back requires vertical pulling (pull-ups, pulldowns) for width, and horizontal pulling (rows) for thickness.",
    exercises: "Pull-ups, Barbell Rows, Lat Pulldowns, Seated Cable Rows",
    baseImg: "https://wger.de/static/images/muscles/muscular_system_back.svg",
    muscleImg: [
      "https://wger.de/static/images/muscles/main/muscle-12.svg",
      "https://wger.de/static/images/muscles/main/muscle-9.svg"
    ],
    heads: [
      { name: "Lats (Latissimus Dorsi)", desc: "Creates the 'V-Taper' width of the back.", target: "Pull-ups, Lat Pulldowns", imgOverride: ["https://wger.de/static/images/muscles/main/muscle-12.svg"] },
      { name: "Traps & Rhomboids", desc: "Builds the thick, 3D look in the upper/middle back.", target: "Barbell Rows, Shrugs", imgOverride: ["https://wger.de/static/images/muscles/main/muscle-9.svg"] },
      { name: "Erector Spinae", desc: "Lower back columns protecting the spine.", target: "Deadlifts", clip: "polygon(35% 40%, 65% 40%, 65% 65%, 35% 65%)" }
    ]
  },
  {
    id: "shoulders",
    name: "Shoulders (Deltoids)",
    position: "Wrapping around the shoulder joint: Anterior (front), Lateral (side), and Posterior (rear).",
    mechanics: "Arm abduction, overhead flexion, and rear extension.",
    training: "Train all three heads for a 3D look. Heavy overhead presses build front/overall mass, lateral raises build side width, and face pulls build rear delts.",
    exercises: "Overhead Press, Lateral Raises, Face Pulls, Reverse Pec Deck",
    baseImg: "https://wger.de/static/images/muscles/muscular_system_front.svg",
    muscleImg: ["https://wger.de/static/images/muscles/main/muscle-2.svg"],
    heads: [
      { name: "Front Deltoid (Anterior)", desc: "Pushes weight overhead and forward.", target: "Overhead Barbell Press, Front Raises", clip: "polygon(28% 0, 72% 0, 72% 100%, 28% 100%)" },
      { name: "Side Deltoid (Lateral)", desc: "Creates shoulder width and capped look.", target: "Dumbbell Lateral Raises, Cable Laterals", clip: "polygon(22% 0, 28% 0, 28% 100%, 22% 100%)" },
      { name: "Rear Deltoid (Posterior)", desc: "Pulls shoulder blades back; crucial for posture.", target: "Face Pulls, Reverse Pec Deck", clip: "polygon(0 0, 22% 0, 22% 100%, 0 100%)" }
    ]
  },
  {
    id: "biceps",
    name: "Biceps Brachii",
    position: "Anterior (front) compartment of the upper arm.",
    mechanics: "Elbow flexion and forearm supination (turning palm up).",
    training: "Because biceps supinate the wrist, rotating pinky outward at top of dumbbell curl maximizes contraction. Keep elbows strictly pinned.",
    exercises: "Barbell Curls, Hammer Curls, Preacher Curls",
    baseImg: "https://wger.de/static/images/muscles/muscular_system_front.svg",
    muscleImg: [
      "https://wger.de/static/images/muscles/main/muscle-1.svg",
      "https://wger.de/static/images/muscles/main/muscle-13.svg"
    ],
    heads: [
      { name: "Short Head (Inner)", desc: "Provides width to the arm from the front.", target: "Wide-Grip Barbell Curls", clip: "polygon(25% 0, 75% 0, 75% 100%, 25% 100%)", imgOverride: ["https://wger.de/static/images/muscles/main/muscle-1.svg"] },
      { name: "Long Head (Outer)", desc: "Builds the bicep peak when flexed.", target: "Incline Dumbbell Curls", clip: "polygon(0 0, 25% 0, 25% 100%, 0 100%)", imgOverride: ["https://wger.de/static/images/muscles/main/muscle-1.svg"] },
      { name: "Brachialis", desc: "Sits under bicep; pushes the whole muscle up.", target: "Hammer Curls", imgOverride: ["https://wger.de/static/images/muscles/main/muscle-13.svg"] }
    ]
  },
  {
    id: "triceps",
    name: "Triceps Brachii",
    position: "Posterior (back) compartment of the upper arm. Makes up 60-70% of total arm mass.",
    mechanics: "Elbow extension (straightening the arm).",
    training: "To hit the long head, do overhead extension movements. For lateral head, rope pushdowns work best.",
    exercises: "Tricep Pushdowns, Overhead Cable Extensions, Skull Crushers",
    baseImg: "https://wger.de/static/images/muscles/muscular_system_back.svg",
    muscleImg: ["https://wger.de/static/images/muscles/main/muscle-5.svg"],
    heads: [
      { name: "Long Head (Inner)", desc: "Largest head; requires arms overhead.", target: "Overhead Dumbbell Extensions", clip: "polygon(25% 0, 75% 0, 75% 100%, 25% 100%)" },
      { name: "Lateral Head (Outer)", desc: "The horseshoe shape on outside of arm.", target: "Rope Pushdowns", clip: "polygon(0 0, 25% 0, 25% 100%, 0 100%)" },
      { name: "Medial Head", desc: "Stabilizes elbow at full extension.", target: "Reverse-Grip Pushdowns", clip: "polygon(0 35%, 100% 35%, 100% 100%, 0 100%)" }
    ]
  },
  {
    id: "legs",
    name: "Quads & Hamstrings",
    position: "Large muscles on front (Quadriceps) and back (Hamstrings) of thigh.",
    mechanics: "Quads extend the knee. Hamstrings flex knee and extend hips.",
    training: "Squats build overall mass; isolate hamstrings with Romanian deadlifts to prevent knee imbalances.",
    exercises: "Barbell Squats, Leg Press, Romanian Deadlifts, Leg Extensions",
    baseImg: "https://wger.de/static/images/muscles/muscular_system_front.svg",
    muscleImg: [
      "https://wger.de/static/images/muscles/main/muscle-10.svg",
      "https://wger.de/static/images/muscles/main/muscle-11.svg",
      "https://wger.de/static/images/muscles/main/muscle-7.svg"
    ],
    heads: [
      { name: "Quadriceps (Front)", desc: "Four muscles driving knee extension.", target: "Barbell Squats, Leg Extensions", imgOverride: ["https://wger.de/static/images/muscles/main/muscle-10.svg"] },
      { name: "Hamstrings (Back)", desc: "Knee flexion and hip extension.", target: "Romanian Deadlifts (RDLs)", imgOverride: ["https://wger.de/static/images/muscles/main/muscle-11.svg"] },
      { name: "Calves", desc: "Ankle extension.", target: "Standing Calf Raises", imgOverride: ["https://wger.de/static/images/muscles/main/muscle-7.svg"] }
    ]
  },
  {
    id: "glutes",
    name: "Gluteus Maximus",
    position: "The buttocks. Heaviest and most powerful muscle in the body.",
    mechanics: "Hip extension and external rotation.",
    training: "Heavy hip-hinge movements are mandatory. Direct horizontal loading (Hip Thrusts) provides highest activation.",
    exercises: "Barbell Hip Thrusts, Bulgarian Split Squats, Glute Bridges",
    baseImg: "https://wger.de/static/images/muscles/muscular_system_back.svg",
    muscleImg: ["https://wger.de/static/images/muscles/main/muscle-8.svg"],
    heads: [
      { name: "Gluteus Maximus", desc: "Main mass of the glutes.", target: "Barbell Hip Thrusts", clip: "polygon(0 42%, 100% 42%, 100% 58%, 0 58%)" },
      { name: "Gluteus Medius", desc: "Upper/side glute; stabilizes pelvis.", target: "Bulgarian Split Squats", clip: "polygon(0 35%, 100% 35%, 100% 46%, 0 46%)" }
    ]
  },
  {
    id: "abs",
    name: "Core / Rectus Abdominis",
    position: "Front of abdomen, stretching from ribs to pelvis.",
    mechanics: "Spinal flexion and core stabilization under heavy loads.",
    training: "Abs must be trained with progressive resistance. Use cable crunches and hanging leg raises.",
    exercises: "Cable Crunches, Hanging Leg Raises, Weighted Planks",
    baseImg: "https://wger.de/static/images/muscles/muscular_system_front.svg",
    muscleImg: [
      "https://wger.de/static/images/muscles/main/muscle-6.svg",
      "https://wger.de/static/images/muscles/main/muscle-14.svg"
    ],
    heads: [
      { name: "Upper Abs", desc: "Flexes spine forward.", target: "Cable Crunches", clip: "polygon(0 30%, 100% 30%, 100% 40%, 0 40%)", imgOverride: ["https://wger.de/static/images/muscles/main/muscle-6.svg"] },
      { name: "Lower Abs", desc: "Lower rectus abdominis.", target: "Hanging Leg Raises", clip: "polygon(0 39%, 100% 39%, 100% 50%, 0 50%)", imgOverride: ["https://wger.de/static/images/muscles/main/muscle-6.svg"] },
      { name: "Obliques", desc: "Side core muscles; responsible for rotation.", target: "Russian Twists", imgOverride: ["https://wger.de/static/images/muscles/main/muscle-14.svg"] }
    ]
  }
]

export default function MuscleGuide({ onClose }) {
  const [active, setActive] = useState(null)
  const [selectedHead, setSelectedHead] = useState(null)
  const [hoveredHead, setHoveredHead] = useState(null)

  const activeHead = selectedHead !== null ? selectedHead : hoveredHead

  if (active) {
    return (
      <div className="mb-12 pb-16 fade-up">
        <button 
          onClick={() => { setActive(null); setSelectedHead(null); setHoveredHead(null); }} 
          className="text-[#C7F36B] font-bold mb-4 hover:underline text-sm inline-flex items-center gap-1 cursor-pointer"
        >
          ← Back to Directory
        </button>
        <div className="relative iron-card p-6 md:p-8 shadow-2xl flex flex-col md:flex-row gap-8 items-start">
          <div className="w-full md:w-1/3 bg-white rounded-2xl p-4 flex flex-col items-center justify-center relative min-h-[340px] md:sticky md:top-24 select-none overflow-hidden group">
            <div className="absolute top-2.5 left-2.5 bg-[#10181D]/90 text-[#54D8CF] text-[10px] font-extrabold px-2.5 py-1 rounded-full border border-[#304149] z-20 pointer-events-none shadow-md">
              👆 Touch diagram to target
            </div>

            <img src={active.baseImg} alt="body base" className="absolute h-full max-h-80 object-contain mix-blend-multiply opacity-85 pointer-events-none" />
            
            {(() => {
              let imagesToRender = [];
              let clipToApply = 'none';

              if (activeHead !== null && active.heads && active.heads[activeHead]) {
                const head = active.heads[activeHead];
                imagesToRender = head.imgOverride ? head.imgOverride : (Array.isArray(active.muscleImg) ? active.muscleImg : [active.muscleImg]);
                if (head.clip) clipToApply = head.clip;
              } else {
                imagesToRender = Array.isArray(active.muscleImg) ? active.muscleImg : [active.muscleImg];
              }

              return imagesToRender.map((imgUrl, i) => (
                <img key={i} src={imgUrl} alt={active.name} 
                     style={{ clipPath: clipToApply, transition: 'clip-path 0.25s cubic-bezier(0.4, 0, 0.2, 1)' }}
                     className="absolute h-full max-h-80 object-contain mix-blend-multiply drop-shadow-[0_0_16px_rgba(84,216,207,1)] pointer-events-none" />
              ));
            })()}

            {/* Interactive diagram touch/click hot-zones */}
            {active.heads && active.heads.length > 0 && (
              <div className="absolute inset-0 max-h-80 my-auto w-full flex flex-col z-10">
                {active.heads.map((head, idx) => {
                  const isPinned = selectedHead === idx;
                  const isCurrent = activeHead === idx;
                  return (
                    <div 
                      key={idx}
                      onClick={() => setSelectedHead(isPinned ? null : idx)}
                      onMouseEnter={() => setHoveredHead(idx)}
                      onMouseLeave={() => setHoveredHead(null)}
                      title={`Target ${head.name}`}
                      className={`flex-1 w-full cursor-pointer transition-all duration-150 flex items-center justify-center relative ${
                        isPinned 
                          ? 'bg-[#C7F36B]/20 border-y border-[#C7F36B]/60 shadow-inner' 
                          : isCurrent 
                          ? 'bg-[#54D8CF]/20 border-y border-[#54D8CF]/50' 
                          : 'hover:bg-[#54D8CF]/10'
                      }`}
                    >
                      {(isPinned || isCurrent) && (
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full shadow-lg ${
                          isPinned ? 'bg-[#C7F36B] text-[#10181D]' : 'bg-[#54D8CF] text-[#10181D]'
                        }`}>
                          {head.name}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex-1 space-y-5 w-full">
            <div>
              <div className="text-[11px] font-bold tracking-[0.25em] uppercase text-[#54D8CF] mb-1">Anatomy Detail</div>
              <h2 className="text-3xl font-extrabold text-[#F4F7F8] tracking-wide">{active.name.toUpperCase()}</h2>
            </div>
            
            <div className="grid grid-cols-1 gap-3">
              <div className="bg-[#10181D] border border-[#304149] rounded-xl p-4">
                <h4 className="text-[11px] font-bold uppercase text-[#ACBAC2] mb-1">📍 Position</h4>
                <p className="text-sm text-[#F4F7F8] leading-relaxed">{active.position}</p>
              </div>
              <div className="bg-[#10181D] border border-[#304149] rounded-xl p-4">
                <h4 className="text-[11px] font-bold uppercase text-[#ACBAC2] mb-1">⚙️ Mechanics</h4>
                <p className="text-sm text-[#F4F7F8] leading-relaxed">{active.mechanics}</p>
              </div>
              <div className="bg-[#54D8CF]/10 border border-[#54D8CF]/30 rounded-xl p-4">
                <h4 className="text-[11px] font-bold uppercase text-[#54D8CF] mb-1">🛠️ How to Build Properly</h4>
                <p className="text-sm text-[#F4F7F8] leading-relaxed">{active.training}</p>
              </div>
              <div className="bg-[#10181D] border border-[#304149] rounded-xl p-4">
                <h4 className="text-[11px] font-bold uppercase text-[#ACBAC2] mb-1">🔥 Top Exercises</h4>
                <p className="text-sm font-semibold text-[#C7F36B]">{active.exercises}</p>
              </div>

              {active.heads && active.heads.length > 0 && (
                <div className="bg-[#10181D] border border-[#304149] rounded-xl p-4 mt-2">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-[11px] font-bold uppercase text-[#54D8CF]">🎯 Sub-Muscle Targeting</h4>
                    {selectedHead !== null && (
                      <button 
                        onClick={() => setSelectedHead(null)}
                        className="text-xs text-[#ACBAC2] hover:text-[#C7F36B] underline cursor-pointer"
                      >
                        Reset Selection
                      </button>
                    )}
                  </div>
                  <div className="space-y-3" onMouseLeave={() => setHoveredHead(null)}>
                    {active.heads.map((head, idx) => {
                      const isPinned = selectedHead === idx;
                      const isCurrent = activeHead === idx;
                      return (
                        <div 
                          key={idx} 
                          onClick={() => setSelectedHead(isPinned ? null : idx)}
                          onMouseEnter={() => setHoveredHead(idx)} 
                          className={`border-l-4 pl-3.5 pr-3 py-2.5 transition-all rounded-r-xl cursor-pointer ${
                            isPinned
                              ? 'border-[#C7F36B] bg-[#C7F36B]/20 text-[#F4F7F8] ring-1 ring-[#C7F36B]/40 shadow-lg'
                              : isCurrent
                              ? 'border-[#54D8CF] bg-[#54D8CF]/15 text-[#F4F7F8]'
                              : 'border-[#304149] bg-[#172127]/60 hover:bg-[#172127] hover:border-[#54D8CF]'
                          }`}
                        >
                          <div className="text-sm font-bold text-[#F4F7F8] mb-0.5 flex items-center justify-between">
                            <span>{head.name}</span>
                            {isPinned ? (
                              <span className="text-xs text-[#C7F36B] font-extrabold bg-[#C7F36B]/20 px-2 py-0.5 rounded-full border border-[#C7F36B]/40">
                                Selected Target ✓
                              </span>
                            ) : isCurrent ? (
                              <span className="text-xs text-[#54D8CF] font-medium">Hover Preview</span>
                            ) : null}
                          </div>
                          <div className="text-xs text-[#ACBAC2] mb-1.5 leading-relaxed">{head.desc}</div>
                          <div className="text-xs font-semibold text-[#C7F36B] bg-[#10181D]/60 p-2 rounded-lg border border-[#304149]">
                            🎯 Target Exercises: {head.target}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mb-8 fade-up">
      <div className="flex items-center justify-between mb-4">
        <button onClick={onClose} className="text-[#C7F36B] font-bold hover:underline text-sm inline-flex items-center gap-1">
          ← Back to Command Center
        </button>
      </div>

      <div className="relative iron-card p-6 md:p-8 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <div className="text-[11px] font-bold tracking-[0.25em] uppercase text-[#54D8CF] mb-1">Knowledge Base</div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-[#F4F7F8] tracking-wide">MUSCLE ANATOMY GUIDE</h2>
            <p className="text-sm text-[#ACBAC2] mt-1 max-w-xl">
              Click on any muscle group to view detailed anatomical diagrams, biomechanics, and precise training protocols.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {MUSCLE_DB.map(m => (
            <button key={m.id} onClick={() => { setActive(m); setSelectedHead(null); setHoveredHead(null); }} 
              className="group relative rounded-2xl overflow-hidden border border-[#304149] bg-white flex flex-col h-full transition-all duration-200 hover:border-[#54D8CF] text-left">
              <div className="h-44 w-full relative p-4 flex items-center justify-center">
                <img src={m.baseImg} alt="base" className="absolute h-full object-contain opacity-80" />
                {Array.isArray(m.muscleImg) ? m.muscleImg.map((imgUrl, i) => (
                  <img key={i} src={imgUrl} alt={m.name} className="absolute h-full object-contain" />
                )) : (
                  <img src={m.muscleImg} alt={m.name} className="absolute h-full object-contain" />
                )}
              </div>
              <div className="p-3.5 bg-[#10181D] border-t border-[#304149] w-full relative z-10 mt-auto">
                <h3 className="text-base font-bold text-[#F4F7F8] group-hover:text-[#54D8CF] transition-colors">
                  {m.name.split(' ')[0].toUpperCase()}
                </h3>
                <div className="text-[10px] text-[#ACBAC2] mt-0.5 uppercase tracking-wider">Click to study →</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
