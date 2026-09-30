import WorkoutPlanSelector from "./components/WorkoutPlanSelector";

export default function App() {
  function handlePlanSaved(plan) {
    console.log("✅ Plan saved:", plan);
    // TODO: persist to localStorage / backend
    // localStorage.setItem("workoutPlan", JSON.stringify(plan));
  }

  return <WorkoutPlanSelector onSave={handlePlanSaved} />;
}
