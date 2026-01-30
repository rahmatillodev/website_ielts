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
      console.log('questionGroup', questionGroup);
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

/**
 * Process a question group from nested query structure
 * Structure: question -> questions[], question -> options[]
 * Options are nested under question (group), matched to questions via question_number
 */
export const processNestedQuestionGroup = (questionGroup) => {
  
  const groupType = (questionGroup.type || "").toLowerCase();
  
  // Get questions array and options array (both nested under question group)
  const nestedQuestions = questionGroup.questions || [];
  const groupOptions = questionGroup.options || [];
  
  // Process each question and match options to it
  
  
  const processedQuestions = nestedQuestions
    // .filter(q => q.is_correct !== false) // Filter out distractors
    .map((question) => {
      // Match options to this question based on question_number
      // Options can be:
      // 1. Linked to this specific question (question_number matches)
      // 2. Group-level options (question_number is null) - shared across all questions
      const questionSpecificOptions = groupOptions.filter(
        opt => opt.question_number === question.question_number
      );
      
      const groupLevelOptions = groupOptions.filter(
        opt => opt.question_number === null || opt.question_number === undefined
      );
      
      // Combine question-specific and group-level options
      // For multiple_choice, use question-specific options
      // For other types (table, map, matching_information), use group-level options
      const isMultipleChoice = groupType.includes("multiple") || groupType.includes("choice");
      const optionsToUse = isMultipleChoice ? questionSpecificOptions : groupLevelOptions;
      
      // Process options for this question
      const questionOptions = optionsToUse.map((opt, index) => {
        // Generate letter if not present
        const letter = opt.letter || getLetterFromIndex(index);
        return {
          id: opt.id,
          option_text: opt.option_text,
          letter: letter,
          is_correct: opt.is_correct || false,
          question_id: opt.question_id,
          question_number: opt.question_number,
          option_key: opt.option_key,
        };
      });

      return {
        id: question.id,
        question_id: question.question_id,
        part_id: question.part_id,
        question_number: question.question_number,
        question_text: question.question_text || "",
        correct_answer: question.correct_answer || "",
        explanation: question.explanation || "",
        is_correct: question.is_correct !== false,
        options: questionOptions,
      };
    })
    .sort((a, b) => {
      const aNum = a.question_number ?? 0;
      const bNum = b.question_number ?? 0;
      return aNum - bNum;
    });

  // For multiple_choice, each question in the group is a separate question
  // For other types, questions are grouped together
  const isMultipleChoice = groupType.includes("multiple") || groupType.includes("choice");
  const isTableCompletion = groupType === "table_completion";
  const isTableType = groupType.includes("table") && !isTableCompletion;
  const isFillInTheBlanks = groupType === "fill_in_blanks";
  const isDragAndDrop = groupType.includes("drag") || groupType.includes("drop") || groupType.includes("summary_completion");
  const isMap = groupType.includes("map");
  const isMatchingInformation = groupType.includes("matching_information");

  // For multiple_choice: options are per question, so we return as-is
  if (isMultipleChoice) {
    return {
      id: questionGroup.id,
      test_id: questionGroup.test_id,
      part_id: questionGroup.part_id,
      type: questionGroup.type,
      instruction: questionGroup.instruction || "",
      question_text: questionGroup.question_text || "",
      question_range: questionGroup.question_range,
      image_url: questionGroup.image_url,
      questions: processedQuestions,
      options: [], // Options are nested under questions
    };
  }

  // For table_completion: extract table structure from question_text
  if (isTableCompletion) {
    const questionText = questionGroup.question_text || "";
    let columnHeaders = [];
    let parsedTableData = null;

    if (questionText) {
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(questionText, "text/html");
        const table = doc.querySelector("table");

        if (table) {
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
        console.error("[processNestedQuestionGroup] Error parsing HTML:", error);
      }
    }

    return {
      id: questionGroup.id,
      test_id: questionGroup.test_id,
      part_id: questionGroup.part_id,
      type: questionGroup.type,
      instruction: questionGroup.instruction || "",
      question_text: questionGroup.question_text || "",
      question_range: questionGroup.question_range,
      image_url: questionGroup.image_url,
      questions: processedQuestions,
      options: [],
      column_headers: columnHeaders,
      parsed_table_data: parsedTableData,
    };
  }

  // For table, map, drag_drop, matching_information: get group-level options
  // Group-level options are those with question_number === null
  // These are already extracted from groupOptions in the processing above
  let groupLevelOptions = [];
  
  if (isTableType || isMap || isMatchingInformation || isDragAndDrop) {
    // Extract group-level options (question_number === null)
    const groupLevelOptionsRaw = groupOptions.filter(
      opt => opt.question_number === null || opt.question_number === undefined
    );
    
    
    groupLevelOptions = groupLevelOptionsRaw
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
        option_key: opt.option_key,
        letter: opt.letter || opt.option_key || getLetterFromIndex(index),
        is_correct: opt.is_correct || false,
        question_id: opt.question_id,
        question_number: opt.question_number,
      }));
  }

  return {
    id: questionGroup.id,
    test_id: questionGroup.test_id,
    part_id: questionGroup.part_id,
    type: questionGroup.type,
    instruction: questionGroup.instruction || "",
    question_text: questionGroup.question_text || "",
    question_range: questionGroup.question_range,
    image_url: questionGroup.image_url,
    questions: processedQuestions,
    options: groupLevelOptions,
  };
};

