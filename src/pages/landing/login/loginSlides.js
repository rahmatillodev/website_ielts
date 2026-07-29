import ProgressSlide from "./slides/ProgressSlide";
import ReadingSlide from "./slides/ReadingSlide";
import SpeakingSlide from "./slides/SpeakingSlide";
import ImprovementSlide from "./slides/ImprovementSlide";

/**
 * The sign-in deck.
 *
 * Written for someone who already has a history here: every line assumes work
 * already done and picks it back up. The sign-up deck (`signupSlides.js`) is the
 * mirror of this — same machinery, opposite moment — and the two share no copy.
 */
export const LOGIN_SLIDES = [
  {
    id: "progress",
    title: "Continue your progress",
    subtitle: "Your band, your streak and your next task are where you left them.",
    Visual: ProgressSlide,
  },
  {
    id: "reading",
    title: "Practice with focus",
    subtitle: "Pick up timed reading sessions and keep your accuracy climbing.",
    Visual: ReadingSlide,
  },
  {
    id: "speaking",
    title: "Speak with confidence",
    subtitle: "Record another answer and hear how it scores against the descriptors.",
    Visual: SpeakingSlide,
  },
  {
    id: "improvement",
    title: "Improve every week",
    subtitle: "See what moved since your last session and what to work on next.",
    Visual: ImprovementSlide,
  },
];
