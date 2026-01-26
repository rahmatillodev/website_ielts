/**
 * Question type data transformation utilities
 * Processes raw database data into structured question groups and questions
 */

/**
 * Generate letter from index (A, B, C, D, etc.)
 */
export const getLetterFromIndex = (index) => {
  return String.fromCharCode(65 + index); // 65 is 'A' in ASCII
};

/**
 * Process table_completion question type
 */
export const processTableCompletion = (questionGroup, individualQuestionsData) => {
  // Get questions from questions table for this question group
  const groupQuestions = individualQuestionsData
    .filter((iq) => iq.question_id === questionGroup.id)
    .map((individualQuestion) => {
      return {
        id: individualQuestion.id || `q-${questionGroup.id}-${individualQuestion.question_number}`,
        question_id: questionGroup.id,
        question_number: individualQuestion.question_number,
        question_text: individualQuestion.question_text || "",
        correct_answer: individualQuestion.correct_answer || "",
      };
    })
    .sort((a, b) => {
      const aNum = a.question_number ?? 0;
      const bNum = b.question_number ?? 0;
      return aNum - bNum;
    });

  // Parse HTML table from question_text to extract structure
  const questionText = questionGroup.question_text || "";
  let columnHeaders = [];
  let parsedTableData = null;

  if (questionText) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(questionText, "text/html");
      const table = doc.querySelector("table");

      if (table) {
        // Extract column headers from thead
        const thead = table.querySelector("thead");
        if (thead) {
          const headerRow = thead.querySelector("tr");
          if (headerRow) {
            const thElements = headerRow.querySelectorAll("th");
            columnHeaders = Array.from(thElements).map((th) => {
              return th.textContent?.trim() || "";
            });
          }
        }

        // Extract rows from tbody
        const tbody = table.querySelector("tbody");
        if (tbody) {
          const rows = tbody.querySelectorAll("tr");
          parsedTableData = {
            columnHeaders,
            rows: Array.from(rows).map((row) => {
              const cells = row.querySelectorAll("td");
              return Array.from(cells).map((td) => {
                return td.innerHTML?.trim() || "";
              });
            }),
          };
        }
      }
    } catch (error) {
      console.error("[processTableCompletion] Error parsing HTML:", error);
    }
  }

  return {
    ...questionGroup,
    questions: groupQuestions,
    options: [],
    column_headers: columnHeaders,
    parsed_table_data: parsedTableData,
  };
};

/**
 * Process table type (list of headings, map, etc.)
 */
export const processTableType = (questionGroup, individualQuestionsData, allOptions) => {
  // Get group-level options (where question_number is null)
  const optionsMap = new Map();
  allOptions
    .filter((opt) => {
      return (
        opt.question_id === questionGroup.id &&
        opt.question_number === null
      );
    })
    .forEach((opt) => {
      const key = opt.id || `${opt.question_id}-${opt.option_text}`;
      if (!optionsMap.has(key)) {
        optionsMap.set(key, opt);
      }
    });

  // Convert map to array and map to final structure
  const groupLevelOptions = Array.from(optionsMap.values())
    .map((opt, optIndex) => {
      return {
        id: opt.id,
        option_text: opt.option_text,
        letter: opt.letter || getLetterFromIndex(optIndex),
        is_correct: opt.is_correct || false,
        question_id: opt.question_id,
        question_number: opt.question_number,
      };
    })
    .sort((a, b) => {
      if (a.letter && b.letter) {
        return a.letter.localeCompare(b.letter);
      }
      if (a.option_text && b.option_text) {
        return a.option_text.localeCompare(b.option_text);
      }
      return (a.id || 0) - (b.id || 0);
    })
    .map((opt, sortedIndex) => ({
      ...opt,
      letter: opt.letter || getLetterFromIndex(sortedIndex),
    }));

  // Get questions from questions table for this question group
  const groupQuestionsFromTable = individualQuestionsData
    .filter((iq) => iq.question_id === questionGroup.id)
    .map((individualQuestion) => {
      return {
        id:
          individualQuestion.id ||
          `q-${questionGroup.id}-${individualQuestion.question_number}`,
        question_id: questionGroup.id,
        question_number: individualQuestion.question_number,
        question_text:
          individualQuestion.question_text ||
          `Question ${individualQuestion.question_number}`,
        correct_answer: individualQuestion.correct_answer || "",
        options: [],
      };
    })
    .sort((a, b) => {
      const aNum = a.question_number ?? 0;
      const bNum = b.question_number ?? 0;
      return aNum - bNum;
    });

  return {
    ...questionGroup,
    questions: groupQuestionsFromTable,
    options: groupLevelOptions,
  };
};

/**
 * Process multiple_choice question type
 */
export const processMultipleChoice = (questionGroup, allOptions) => {
  // Get all options for this question group
  const groupOptions = allOptions
    .filter((opt) => opt.question_id === questionGroup.id)
    .map((opt, index) => ({
      id: opt.id,
      option_text: opt.option_text,
      letter: getLetterFromIndex(index),
      is_correct: opt.is_correct,
      question_id: opt.question_id,
      question_number: opt.question_number,
    }));

  // Group options by question_number to create questions
  const optionsByQuestionNumber = {};
  groupOptions.forEach((opt) => {
    const qNum = opt.question_number;
    if (qNum !== null && qNum !== undefined) {
      if (!optionsByQuestionNumber[qNum]) {
        optionsByQuestionNumber[qNum] = [];
      }
      optionsByQuestionNumber[qNum].push(opt);
    }
  });

  // Create questions from options
  const groupQuestions = Object.keys(optionsByQuestionNumber)
    .map((qNum) => {
      const qNumInt = parseInt(qNum, 10);
      const questionOptions = optionsByQuestionNumber[qNum].map(
        (opt, index) => ({
          ...opt,
          letter: getLetterFromIndex(index),
        })
      );

      // Find correct answer for this question
      const correctOption = questionOptions.find(
        (opt) => opt.is_correct === true
      );
      const correctAnswer = correctOption
        ? correctOption.option_text
        : "";

      return {
        id: `q-${questionGroup.id}-${qNum}`,
        question_id: questionGroup.id,
        question_number: qNumInt,
        question_text:
          questionGroup.question_text || `Question ${qNum}`,
        options: questionOptions,
        correct_answer: correctAnswer,
      };
    })
    .sort((a, b) => {
      const aNum = a.question_number ?? 0;
      const bNum = b.question_number ?? 0;
      return aNum - bNum;
    });

  return {
    ...questionGroup,
    questions: groupQuestions,
    options: [],
  };
};

/**
 * Process other question types (fill_in_blanks, drag_drop, matching_information, etc.)
 */
export const processOtherQuestionTypes = (questionGroup, individualQuestionsData, allOptions) => {
  // Get individual questions for this question group
  const groupQuestions = individualQuestionsData
    .filter((iq) => iq.question_id === questionGroup.id)
    .map((individualQuestion) => {
      // Get options for this specific question
      const questionOptions = allOptions
        .filter(
          (opt) =>
            opt.question_id === questionGroup.id &&
            opt.question_number === individualQuestion.question_number
        )
        .sort((a, b) => {
          if (a.letter && b.letter) {
            return a.letter.localeCompare(b.letter);
          }
          return (a.id || 0) - (b.id || 0);
        })
        .map((opt, index) => ({
          id: opt.id,
          option_text: opt.option_text,
          letter: opt.letter || getLetterFromIndex(index),
          is_correct: opt.is_correct,
          question_id: opt.question_id,
          question_number: opt.question_number,
        }));

      return {
        ...individualQuestion,
        options: questionOptions,
      };
    })
    .sort((a, b) => {
      const aNum = a.question_number ?? 0;
      const bNum = b.question_number ?? 0;
      return aNum - bNum;
    });

  // Get group-level options (where question_number is null)
  let groupLevelOptions = allOptions
    .filter(
      (opt) =>
        opt.question_id === questionGroup.id &&
        opt.question_number === null
    )
    .sort((a, b) => {
      if (a.option_key && b.option_key) {
        const aKey = String(a.option_key).toUpperCase();
        const bKey = String(b.option_key).toUpperCase();
        if (/^\d+$/.test(aKey) && /^\d+$/.test(bKey)) {
          return parseInt(aKey) - parseInt(bKey);
        }
        return aKey.localeCompare(bKey);
      }
      if (a.letter && b.letter) {
        return a.letter.localeCompare(b.letter);
      }
      return (a.id || 0) - (b.id || 0);
    })
    .map((opt, index) => ({
      id: opt.id,
      option_text: opt.option_text,
      option_key: opt.option_key || opt.letter || getLetterFromIndex(index),
      letter: opt.letter || opt.option_key || getLetterFromIndex(index),
      is_correct: opt.is_correct,
      question_id: opt.question_id,
      question_number: opt.question_number,
    }));

  return {
    ...questionGroup,
    questions: groupQuestions,
    options: groupLevelOptions,
  };
};

/**
 * Process a question group based on its type
 */
export const processQuestionGroup = (questionGroup, individualQuestionsData, allOptions) => {
  const groupType = (questionGroup.type || "").toLowerCase();
  const isMultipleChoice =
    groupType.includes("multiple") || groupType.includes("choice");
  const isTableCompletion = groupType === "table_completion";
  const isTableType = groupType.includes("table") && !isTableCompletion;

  if (isTableCompletion) {
    return processTableCompletion(questionGroup, individualQuestionsData);
  }

  if (isTableType) {
    return processTableType(questionGroup, individualQuestionsData, allOptions);
  }

  if (isMultipleChoice) {
    return processMultipleChoice(questionGroup, allOptions);
  }

  return processOtherQuestionTypes(questionGroup, individualQuestionsData, allOptions);
};

