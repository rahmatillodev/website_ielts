import GoalSlide from "./slides/GoalSlide";
import SkillsSlide from "./slides/SkillsSlide";
import FeedbackSlide from "./slides/FeedbackSlide";
import GrowthSlide from "./slides/GrowthSlide";

/**
 * The sign-up deck.
 *
 * Written for someone with no history here: it sets a goal, shows what is
 * covered, shows what feedback looks like, and only then talks about progress —
 * the arc of a journey about to start, where the sign-in deck resumes one
 * already underway. No visual and no line of copy is shared between the two.
 */
export const SIGNUP_SLIDES = [
  {
    id: "goal",
    title: "Start with a clear goal",
    subtitle: "Set your target band and build a focused preparation plan.",
    Visual: GoalSlide,
  },
  {
    id: "skills",
    title: "Practice every IELTS skill",
    subtitle: "Improve Listening, Reading, Writing, and Speaking in one place.",
    Visual: SkillsSlide,
  },
  {
    id: "feedback",
    title: "Get meaningful feedback",
    subtitle: "Understand your mistakes and improve with every attempt.",
    Visual: FeedbackSlide,
  },
  {
    id: "growth",
    title: "Track your growth",
    subtitle: "See your progress from your first practice to your target score.",
    Visual: GrowthSlide,
  },
];
