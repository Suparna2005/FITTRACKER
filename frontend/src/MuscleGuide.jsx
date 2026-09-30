import React, { useState } from 'react'

const MUSCLE_DB = [
  {
    id: "chest",
    name: "Chest (Pectoralis Major)",
    position: "Anterior (front) of the upper chest wall, extending from the sternum to the shoulder.",
    mechanics: "Horizontal adduction and internal rotation. It is responsible for pushing your arms away from your body and hugging motions.",
    training: "To build the chest properly, you must hit both the upper clavicular head (via incline presses) and the lower sternal head (via flat presses and dips). Focus on a deep stretch at the bottom of the movement.",
    exercises: "Incline Bench Press, Flat Dumbbell Press, Cable Crossovers, Dips",
    baseImg: "https://wger.de/static/images/muscles/muscular_system_front.svg",
    muscleImg: "https://wger.de/static/images/muscles/main/muscle-4.svg",
    heads: [
      { name: "Upper Chest (Clavicular Head)", desc: "Builds the 'shelf' near the collarbone.", target: "Incline Bench Press, Low-to-High Crossovers", clip: "polygon(0 0, 100% 0, 100% 21%, 0 21%)" },
      { name: "Middle Chest (Sternal Head)", desc: "Provides the main bulk of the pecs.", target: "Flat Bench Press, Pec Deck Flyes", clip: "polygon(0 21%, 100% 21%, 100% 65%, 0 65%)" },
      { name: "Lower Chest (Abdominal Head)", desc: "Develops the lower sweep and defined bottom edge.", target: "Chest Dips, High-to-Low Cable Crossovers, Decline Press", clip: "polygon(0 65%, 100% 65%, 100% 100%, 0 100%)" }
    ]
  },
  {
    id: "back",
    name: "Back (Lats & Traps)",
    position: "Posterior (back) of the torso, spanning from the lower spine up to the humerus (upper arm).",
    mechanics: "Shoulder extension and adduction. It is responsible for pulling your arms down from above your head, or pulling objects toward your torso.",
    training: "Building a wide back requires both vertical pulling (pull-ups, pulldowns) for width, and horizontal pulling (rows) for thickness. Retract your scapula (squeeze shoulder blades) before pulling.",
    exercises: "Pull-ups, Barbell Rows, Lat Pulldowns, Seated Cable Rows",
    baseImg: "https://wger.de/static/images/muscles/muscular_system_back.svg",
    muscleImg: [
      "https://wger.de/static/images/muscles/main/muscle-12.svg", // Lats
      "https://wger.de/static/images/muscles/main/muscle-9.svg"   // Traps
    ],
    heads: [
      { name: "Lats (Latissimus Dorsi)", desc: "Creates the 'V-Taper' width of the back.", target: "Pull-ups, Lat Pulldowns", imgOverride: ["https://wger.de/static/images/muscles/main/muscle-12.svg"] },
      { name: "Traps & Rhomboids", desc: "Builds the thick, 3D look in the upper/middle back.", target: "Barbell Rows, Shrugs", imgOverride: ["https://wger.de/static/images/muscles/main/muscle-9.svg"] },
      { name: "Erector Spinae", desc: "Lower back columns protecting the spine.", target: "Deadlifts", clip: "polygon(40% 0, 60% 0, 60% 100%, 40% 100%)" }
    ]
  },
  {
    id: "shoulders",
    name: "Shoulders (Deltoids)",
    position: "Wrapping around the shoulder joint, consisting of three distinct heads: Anterior (front), Lateral (side), and Posterior (rear).",
    mechanics: "Arm abduction (raising arms to the side), overhead flexion, and rear extension. Highly mobile but prone to injury if overworked.",
    training: "You must train all three heads for a '3D' look. Heavy overhead presses build the front/overall mass, lateral raises build the side (width), and face pulls build the rear for posture.",
    exercises: "Overhead Press, Lateral Raises, Face Pulls, Reverse Pec Deck",
    baseImg: "https://wger.de/static/images/muscles/muscular_system_front.svg",
    muscleImg: ["https://wger.de/static/images/muscles/main/muscle-2.svg"],
    heads: [
      { name: "Front Deltoid (Anterior)", desc: "Pushes weight overhead and forward.", target: "Overhead Barbell Press", clip: "polygon(32% 0, 68% 0, 68% 100%, 32% 100%)" },
      { name: "Side/Rear Deltoid", desc: "Creates shoulder width and the 'capped' look.", target: "Dumbbell Lateral Raises, Face Pulls", clip: "polygon(0 0, 32% 0, 32% 100%, 0 100%, 100% 0, 100% 100%, 68% 100%, 68% 0)" }
    ]
  },
  {
    id: "biceps",
    name: "Biceps Brachii",
    position: "Anterior (front) compartment of the upper arm.",
    mechanics: "Elbow flexion and forearm supination (turning the palm up).",
    training: "Because the bicep also supinates the wrist, rotating your pinky outward at the top of a dumbbell curl maximizes the contraction. Keep your elbows strictly pinned to your sides.",
    exercises: "Barbell Curls, Hammer Curls (hits the brachialis), Preacher Curls",
    baseImg: "https://wger.de/static/images/muscles/muscular_system_front.svg",
    muscleImg: [
      "https://wger.de/static/images/muscles/main/muscle-1.svg", // Biceps
      "https://wger.de/static/images/muscles/main/muscle-13.svg" // Brachialis
    ],
    heads: [
      { name: "Short Head (Inner)", desc: "Provides width to the arm when viewed from the front.", target: "Wide-Grip Barbell Curls", clip: "polygon(22% 0, 78% 0, 78% 100%, 22% 100%)", imgOverride: ["https://wger.de/static/images/muscles/main/muscle-1.svg"] },
      { name: "Long Head (Outer)", desc: "Builds the bicep 'peak' when flexed.", target: "Incline Dumbbell Curls", clip: "polygon(0 0, 22% 0, 22% 100%, 0 100%, 100% 0, 100% 100%, 78% 100%, 78% 0)", imgOverride: ["https://wger.de/static/images/muscles/main/muscle-1.svg"] },
      { name: "Brachialis", desc: "Sits under the bicep; pushes the whole muscle up.", target: "Hammer Curls", imgOverride: ["https://wger.de/static/images/muscles/main/muscle-13.svg"] }
    ]
  },
  {
    id: "triceps",
    name: "Triceps Brachii",
    position: "Posterior (back) compartment of the upper arm. It makes up roughly 60-70% of total arm mass.",
    mechanics: "Elbow extension (straightening the arm).",
    training: "To hit the long head of the tricep (which provides the most mass), you must do overhead extension movements. For the lateral head, standard pushdowns work best. Lock out completely on every rep.",
    exercises: "Tricep Pushdowns, Overhead Cable Extensions, Skull Crushers",
    baseImg: "https://wger.de/static/images/muscles/muscular_system_back.svg",
    muscleImg: ["https://wger.de/static/images/muscles/main/muscle-5.svg"],
    heads: [
      { name: "Long Head (Inner)", desc: "The largest head; requires arms to be overhead.", target: "Overhead Dumbbell Extensions", clip: "polygon(25% 0, 75% 0, 75% 100%, 25% 100%)" },
      { name: "Lateral Head (Outer)", desc: "The 'horseshoe' shape on the outside of the arm.", target: "Rope Pushdowns", clip: "polygon(0 0, 25% 0, 25% 100%, 0 100%, 100% 0, 100% 100%, 75% 100%, 75% 0)" },
      { name: "Medial Head", desc: "Stabilizes the elbow at full extension.", target: "Reverse-Grip Pushdowns", clip: "polygon(0 35%, 100% 35%, 100% 100%, 0 100%)" }
    ]
  },
  {
    id: "legs",
    name: "Quads & Hamstrings",
    position: "The large muscles on the front (Quadriceps) and back (Hamstrings) of the thigh.",
    mechanics: "Quads extend the knee (straighten the leg). Hamstrings flex the knee and extend the hips.",
    training: "Legs require immense volume and heavy loading. Squats build overall mass, but you must isolate the hamstrings with hinging movements (like Romanian Deadlifts) to prevent knee imbalances.",
    exercises: "Barbell Squats, Leg Press, Romanian Deadlifts, Leg Extensions",
    baseImg: "https://wger.de/static/images/muscles/muscular_system_front.svg",
    muscleImg: [
      "https://wger.de/static/images/muscles/main/muscle-10.svg", // Quads
      "https://wger.de/static/images/muscles/main/muscle-11.svg", // Hamstrings
      "https://wger.de/static/images/muscles/main/muscle-7.svg"   // Calves
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
    position: "The buttocks. It is the heaviest and most powerful muscle in the human body.",
    mechanics: "Hip extension (thrusting hips forward) and external rotation.",
    training: "Heavy hip-hinge movements are mandatory. While squats activate glutes, direct horizontal loading (like Hip Thrusts) provides the highest activation for building mass and athletic power.",
    exercises: "Barbell Hip Thrusts, Bulgarian Split Squats, Glute Bridges",
    baseImg: "https://wger.de/static/images/muscles/muscular_system_back.svg",
    muscleImg: ["https://wger.de/static/images/muscles/main/muscle-8.svg"],
    heads: [
      { name: "Gluteus Maximus", desc: "The main mass of the glutes.", target: "Barbell Hip Thrusts", clip: "polygon(0 48%, 100% 48%, 100% 100%, 0 100%)" },
      { name: "Gluteus Medius", desc: "Upper/side glute; stabilizes the pelvis.", target: "Bulgarian Split Squats", clip: "polygon(0 0, 100% 0, 100% 48%, 0 48%)" }
    ]
  },
  {
    id: "abs",
    name: "Core / Rectus Abdominis",
    position: "The front of the abdomen, stretching from the ribs to the pelvis.",
    mechanics: "Spinal flexion (crunching forward) and core stabilization under heavy loads.",
    training: "Abs are muscles and must be trained with progressive resistance (weights) just like biceps. Doing 100 unweighted crunches is inefficient. Use cable crunches and hanging leg raises.",
    exercises: "Cable Crunches, Hanging Leg Raises, Weighted Planks",
    baseImg: "https://wger.de/static/images/muscles/muscular_system_front.svg",
    muscleImg: [
      "https://wger.de/static/images/muscles/main/muscle-6.svg", // Rectus
      "https://wger.de/static/images/muscles/main/muscle-14.svg" // Obliques
    ],
    heads: [
      { name: "Upper Abs", desc: "Flexes the spine forward.", target: "Cable Crunches", clip: "polygon(0 0, 100% 0, 100% 36%, 0 36%)", imgOverride: ["https://wger.de/static/images/muscles/main/muscle-6.svg"] },
      { name: "Lower Abs", desc: "Technically the lower rectus abdominis.", target: "Hanging Leg Raises", clip: "polygon(0 36%, 100% 36%, 100% 100%, 0 100%)", imgOverride: ["https://wger.de/static/images/muscles/main/muscle-6.svg"] },
      { name: "Obliques", desc: "Side core muscles; responsible for rotation.", target: "Russian Twists", imgOverride: ["https://wger.de/static/images/muscles/main/muscle-14.svg"] }
    ]
  }
]

export default function MuscleGuide({ onClose }) {
  const [active, setActive] = useState(null)
  const [activeHead, setActiveHead] = useState(null)

  if (active) {
    return (
      <div className="mb-8 fade-up">
        <button onClick={() => { setActive(null); setActiveHead(null); }} className="text-yellow-400 font-bold mb-4 hover:underline text-sm">
          ← Back to Directory
        </button>
        <div className="relative glass rounded-3xl p-6 md:p-8 shadow-2xl overflow-hidden flex flex-col md:flex-row gap-8 items-start">
          <div className="absolute top-0 left-0 right-0 h-1" style={{ background: 'linear-gradient(90deg,#f59e0b,#fde047,#f59e0b)' }} />
          
          <div className="w-full md:w-1/3 bg-white rounded-2xl p-4 shadow-inner flex flex-col items-center justify-center relative min-h-[300px]">
            <img src={active.baseImg} alt="body base" className="absolute h-full max-h-80 object-contain mix-blend-multiply opacity-80" />
            
            {(() => {
              let imagesToRender = [];
              let clipToApply = 'none';

              if (activeHead !== null && active.heads[activeHead]) {
                const head = active.heads[activeHead];
                if (head.imgOverride) {
                  imagesToRender = head.imgOverride;
                } else {
                  imagesToRender = Array.isArray(active.muscleImg) ? active.muscleImg : [active.muscleImg];
                }
                if (head.clip) clipToApply = head.clip;
              } else {
                imagesToRender = Array.isArray(active.muscleImg) ? active.muscleImg : [active.muscleImg];
              }

              return imagesToRender.map((imgUrl, i) => (
                <img key={i} src={imgUrl} alt={active.name} 
                     style={{ clipPath: clipToApply, transition: 'clip-path 0.3s ease' }}
                     className="absolute h-full max-h-80 object-contain mix-blend-multiply drop-shadow-[0_0_8px_rgba(255,0,0,0.8)]" />
              ));
            })()}
          </div>

          <div className="flex-1 space-y-6">
            <div>
              <div className="text-[11px] font-bold tracking-[0.25em] uppercase text-yellow-400 mb-1">Anatomy Detail</div>
              <h2 className="font-display text-3xl md:text-4xl font-bold text-white tracking-wide">{active.name.toUpperCase()}</h2>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                <h4 className="text-[11px] font-bold tracking-[0.1em] uppercase text-zinc-500 mb-2">📍 Position</h4>
                <p className="text-sm text-zinc-300 leading-relaxed">{active.position}</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                <h4 className="text-[11px] font-bold tracking-[0.1em] uppercase text-zinc-500 mb-2">⚙️ How it Works (Mechanics)</h4>
                <p className="text-sm text-zinc-300 leading-relaxed">{active.mechanics}</p>
              </div>
              <div className="bg-yellow-400/10 border border-yellow-400/20 rounded-2xl p-5">
                <h4 className="text-[11px] font-bold tracking-[0.1em] uppercase text-yellow-400 mb-2">🛠️ How to Build it Properly</h4>
                <p className="text-sm text-yellow-100/90 leading-relaxed">{active.training}</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                <h4 className="text-[11px] font-bold tracking-[0.1em] uppercase text-zinc-500 mb-2">🔥 Top Exercises</h4>
                <p className="text-sm font-semibold text-white">{active.exercises}</p>
              </div>

              {active.heads && active.heads.length > 0 && (
                <div className="bg-zinc-950 border border-white/10 rounded-2xl p-5 mt-2">
                  <h4 className="text-[11px] font-bold tracking-[0.1em] uppercase text-yellow-400 mb-4">🎯 Sub-Muscle Targeting</h4>
                  <div className="space-y-4">
                    {active.heads.map((head, idx) => (
                      <div key={idx} 
                           onMouseEnter={() => setActiveHead(idx)} 
                           onMouseLeave={() => setActiveHead(null)}
                           className="border-l-2 border-yellow-400/50 pl-4 py-1 hover:bg-white/5 transition-colors cursor-crosshair rounded-r-lg">
                        <div className="text-sm font-bold text-white mb-1 group-hover:text-yellow-400">{head.name}</div>
                        <div className="text-xs text-zinc-400 mb-1.5">{head.desc}</div>
                        <div className="text-xs font-semibold text-yellow-100/70"><span className="text-zinc-500">Target with:</span> {head.target}</div>
                      </div>
                    ))}
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
      <button onClick={onClose} className="text-yellow-400 font-bold mb-4 hover:underline text-sm">
        ← Back to Command Center
      </button>

      <div className="relative glass rounded-3xl p-6 md:p-8 shadow-2xl overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1" style={{ background: 'linear-gradient(90deg,#f59e0b,#fde047,#f59e0b)' }} />
        
        <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
          <div>
            <div className="text-[11px] font-bold tracking-[0.25em] uppercase text-yellow-400 mb-1">Knowledge Base</div>
            <h2 className="font-display text-2xl md:text-3xl font-bold text-white tracking-wide">MUSCLE ANATOMY GUIDE</h2>
            <p className="text-sm text-zinc-400 mt-1 max-w-xl">
              Click on any muscle group to view detailed anatomical diagrams, biomechanics, and precise training protocols.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {MUSCLE_DB.map(m => (
            <button key={m.id} onClick={() => setActive(m)} 
              className="group relative rounded-2xl overflow-hidden border border-white/10 bg-white shadow-lg flex flex-col h-full transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(250,204,21,0.2)] hover:border-yellow-400 text-left">
              <div className="h-48 w-full relative p-4 flex items-center justify-center">
                <img src={m.baseImg} alt="base" className="absolute h-full object-contain opacity-80" />
                {Array.isArray(m.muscleImg) ? m.muscleImg.map((imgUrl, i) => (
                  <img key={i} src={imgUrl} alt={m.name} className="absolute h-full object-contain filter group-hover:drop-shadow-[0_0_8px_rgba(255,0,0,1)] transition duration-500" />
                )) : (
                  <img src={m.muscleImg} alt={m.name} className="absolute h-full object-contain filter group-hover:drop-shadow-[0_0_8px_rgba(255,0,0,1)] transition duration-500" />
                )}
              </div>
              <div className="p-4 bg-zinc-950/95 border-t border-white/10 w-full relative z-10 mt-auto">
                <h3 className="font-display text-lg font-bold text-white tracking-wide group-hover:text-yellow-400 transition-colors">
                  {m.name.split(' ')[0].toUpperCase()}
                </h3>
                <div className="text-[10px] text-zinc-500 mt-1 uppercase tracking-wider">Click to study →</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
