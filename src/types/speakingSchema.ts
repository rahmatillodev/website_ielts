export type TestType = "reading" | "listening" | "writing" | "speaking";
export type Difficulty = "EASY" | "MEDIUM" | "HARD";

export interface TestRow {
  id: string;
  title: string;
  duration: number;
  difficulty: Difficulty;
  type: TestType;
  is_premium: boolean;
  is_active: boolean;
  question_quantity: number;
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
}

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
