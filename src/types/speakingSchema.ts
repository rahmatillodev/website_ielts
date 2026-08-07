/** The Speaking library reuses `test` rows, tagged by these two extra types. */
export type MediaLibraryType = "podcast" | "shadowing";
export type TestType = "reading" | "listening" | "writing" | "speaking" | MediaLibraryType;
export type Difficulty = "EASY" | "MEDIUM" | "HARD";

export interface TestRow {
  id: string;
  title: string;
  /**
   * The exam time limit in **minutes** (default 60). This is not the length of
   * any attached media: podcast and shadowing rows inherit whatever limit was
   * set at creation, so the Speaking library measures its videos from the
   * source instead — see src/utils/mediaDuration.js.
   */
  duration: number;
  difficulty: Difficulty;
  type: TestType;
  is_premium: boolean;
  is_active: boolean;
  question_quantity: number;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface PartRow {
  id: string;
  test_id: string;
  part_number: number;
  title: string | null;
  content: string | null;
  image_url: string | null;
  listening_url: string | null;
  /** Podcast / shadowing video. A YouTube link or a direct media file URL. */
  video_url: string | null;
  /**
   * Real length of `video_url` in **seconds** — what the library cards show.
   *
   * `null` means "not measured yet", and the client measures the video itself
   * (src/utils/mediaDuration.js) rather than showing a placeholder. Anything
   * writing this column must set the actual length of that video; see
   * supabase/migrations/20260807120000_part_video_duration.sql.
   */
  video_duration_seconds: number | null;
}

/** A podcast or shadowing row as the library cards consume it. */
export interface MediaLibraryItem {
  id: string;
  title: string;
  image: string;
  videoUrl: string;
  /** `part.video_duration_seconds`, or null when the row has none stored. */
  durationSeconds: number | null;
  /** Already formatted for display, or "" when it should not be shown. */
  date: string;
  isPremium: boolean;
}

/** Real video lengths in seconds, keyed by `MediaLibraryItem.id`. */
export type MediaDurationMap = Record<string, number | undefined>;

export interface QuestionGroupRow {
  id: string;
  test_id: string;
  part_id: string;
  type: string;
  question_range: number | null;
  instruction: string | null;
  question_text: string | null;
  question_number: number | null;
  image_url: string | null;
}

export interface QuestionRow {
  id: string;
  test_id: string;
  question_id: string;
  part_id: string;
  question_number: number | null;
  question_text: string | null;
  correct_answer: string | null;
  explanation: string | null;
  is_correct: boolean | null;
}

export interface OptionRow {
  id: string;
  test_id: string;
  question_id: string;
  part_id: string;
  question_number: number | null;
  option_text: string;
  option_key: string | null;
  is_correct: boolean;
}

export interface SpeakingQuestionDetail extends QuestionGroupRow {
  questions: QuestionRow[];
  options?: OptionRow[];
}

export interface SpeakingPartDetail extends PartRow {
  question: SpeakingQuestionDetail[];
}

export interface SpeakingTestDetail extends TestRow {
  part: SpeakingPartDetail[];
}
