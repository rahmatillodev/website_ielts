# Fetching Test Data for Users Website

## Overview

This document explains how to fetch test data for the **users website** (the student-facing application). The `getTestById` function from the admin store (`testStore.js`) **cannot be used** for the users website due to:

1. **Permission Requirements**: Admin functions may require elevated permissions that regular users don't have
2. **Row Level Security (RLS)**: Database policies may restrict what data users can access
3. **Data Exposure**: Admin queries may expose sensitive information (like correct answers) that should be hidden during test-taking
4. **Architecture Separation**: Admin and user applications should use separate data access patterns

---

## Table of Contents

1. [Why Not Use Admin `getTestById`](#why-not-use-admin-gettestbyid)
2. [Recommended Approach: Separate Queries](#recommended-approach-separate-queries)
3. [Step-by-Step Implementation](#step-by-step-implementation)
4. [Data Processing for Different Question Types](#data-processing-for-different-question-types)
5. [Security Considerations](#security-considerations)
6. [Complete Example Implementation](#complete-example-implementation)
7. [Error Handling](#error-handling)
8. [Performance Optimization](#performance-optimization)

---

## Why Not Use Admin `getTestById`

### The Admin Function

The admin `getTestById` function uses a complex nested Supabase query:

```javascript
// ❌ DO NOT USE THIS IN USER WEBSITE
async function getTestById(testId) {
  const { data, error } = await supabase
    .from("test")
    .select(`
      *,
      part (
        *,
        question (
          *,
          questions (*),
          options (*)
        )
      )
    `)
    .eq("id", testId)
    .single();
  return data;
}
```

### Problems for Users Website

1. **RLS Policies**: May fail if users don't have permission to read all nested tables
2. **Data Exposure**: Returns correct answers that should be hidden during test-taking
3. **Performance**: Complex nested queries can be slow and may hit query limits
4. **Maintenance**: Couples user website to admin implementation

---

## Recommended Approach: Separate Queries

Instead of one complex nested query, fetch data in **separate, sequential queries**. This approach:

- ✅ Respects RLS policies better
- ✅ Allows filtering sensitive data (correct answers)
- ✅ Better error handling per table
- ✅ More flexible for different use cases (test-taking vs. review)
- ✅ Better performance with proper indexing

### Query Strategy

1. **Fetch test metadata** (basic info)
2. **Fetch parts** (for the test)
3. **Fetch question groups** (for each part)
4. **Fetch individual questions** (for each group)
5. **Fetch options** (for each question/group)

---

## Step-by-Step Implementation

### Step 1: Fetch Test Metadata

```javascript
async function fetchTestMetadata(testId) {
  const { data, error } = await supabase
    .from("test")
    .select("id, title, duration, difficulty, type, is_premium, is_active, question_quantity, created_at")
    .eq("id", testId)
    .eq("is_active", true) // Only fetch active tests
    .single();

  if (error) {
    console.error("Error fetching test metadata:", error);
    return null;
  }

  return data;
}
```

**Important**: 
- Filter by `is_active: true` to only show active tests
- Check `is_premium` if you need to restrict premium content
- Don't fetch `updated_at` or other admin-only fields if not needed

---

### Step 2: Fetch Parts

```javascript
async function fetchTestParts(testId) {
  const { data, error } = await supabase
    .from("part")
    .select("id, test_id, part_number, title, content, image_url, listening_url")
    .eq("test_id", testId)
    .order("part_number", { ascending: true });

  if (error) {
    console.error("Error fetching parts:", error);
    return [];
  }

  return data || [];
}
```

**Notes**:
- Order by `part_number` to maintain correct sequence
- Parts may not have `content` (for listening tests, content might be in audio)

---

### Step 3: Fetch Question Groups

```javascript
async function fetchQuestionGroups(partIds) {
  if (!partIds || partIds.length === 0) return [];

  const { data, error } = await supabase
    .from("question")
    .select("id, test_id, part_id, type, question_range, instruction, question_text, image_url")
    .in("part_id", partIds)
    .order("id"); // Maintain order (you may need to add an order field)

  if (error) {
    console.error("Error fetching question groups:", error);
    return [];
  }

  return data || [];
}
```

**Notes**:
- `question_range` indicates how many questions are in the group
- `image_url` is only used for `map` type
- `question_text` contains the passage/content for some types, null for others

---

### Step 4: Fetch Individual Questions

```javascript
async function fetchQuestions(questionGroupIds, includeCorrectAnswers = false) {
  if (!questionGroupIds || questionGroupIds.length === 0) return [];

  let query = supabase
    .from("questions")
    .select("id, test_id, question_id, part_id, question_number, question_text, explanation, is_correct");

  // Only include correct_answer if explicitly requested (e.g., for review mode)
  if (includeCorrectAnswers) {
    query = query.select("id, test_id, question_id, part_id, question_number, question_text, correct_answer, explanation, is_correct");
  }

  const { data, error } = await query
    .in("question_id", questionGroupIds)
    .order("question_number", { ascending: true });

  if (error) {
    console.error("Error fetching questions:", error);
    return [];
  }

  return data || [];
}
```

**Important**: 
- **For test-taking**: Set `includeCorrectAnswers = false` to hide answers
- **For review mode**: Set `includeCorrectAnswers = true` to show answers
- Filter by `is_correct: true` if you only want valid questions (exclude distractors)

---

### Step 5: Fetch Options

```javascript
async function fetchOptions(questionGroupIds, questionIds = []) {
  if (!questionGroupIds || questionGroupIds.length === 0) return [];

  // Options can be linked to question groups (for table, map, matching_information)
  // OR to individual questions (for multiple_choice)
  let query = supabase
    .from("options")
    .select("id, test_id, question_id, part_id, question_number, option_text, option_key, is_correct");

  // If we have individual question IDs (multiple_choice), fetch those
  if (questionIds.length > 0) {
    query = query.in("question_id", questionIds);
  } else {
    // Otherwise fetch by group IDs
    query = query.in("question_id", questionGroupIds);
  }

  const { data, error } = await query.order("option_text");

  if (error) {
    console.error("Error fetching options:", error);
    return [];
  }

  return data || [];
}
```

**Notes**:
- For `multiple_choice`: Options link to individual question IDs
- For `table`, `map`, `matching_information`: Options link to group IDs with `question_number: null`
- `option_key` is used for `matching_information` type

---

## Data Processing for Different Question Types

After fetching the raw data, you need to process it differently based on question type. Here's how to structure the data:

### Processing Function

```javascript
function processTestData(testMetadata, parts, questionGroups, questions, options) {
  // Group questions by question_id (group ID)
  const questionsByGroup = {};
  questions.forEach(q => {
    if (!questionsByGroup[q.question_id]) {
      questionsByGroup[q.question_id] = [];
    }
    questionsByGroup[q.question_id].push(q);
  });

  // Group options by question_id
  const optionsByGroup = {};
  const optionsByQuestion = {};
  options.forEach(opt => {
    // Options can be at group level (question_number is null) or question level
    if (opt.question_number === null) {
      // Group-level options (table, map, matching_information)
      if (!optionsByGroup[opt.question_id]) {
        optionsByGroup[opt.question_id] = [];
      }
      optionsByGroup[opt.question_id].push(opt);
    } else {
      // Question-level options (multiple_choice)
      if (!optionsByQuestion[opt.question_id]) {
        optionsByQuestion[opt.question_id] = [];
      }
      optionsByQuestion[opt.question_id].push(opt);
    }
  });

  // Group question groups by part_id
  const groupsByPart = {};
  questionGroups.forEach(group => {
    if (!groupsByPart[group.part_id]) {
      groupsByPart[group.part_id] = [];
    }
    groupsByPart[group.part_id].push(group);
  });

  // Build final structure
  const processedParts = parts.map(part => {
    const groups = (groupsByPart[part.id] || []).map(group => {
      const groupQuestions = questionsByGroup[group.id] || [];
      const groupOptions = optionsByGroup[group.id] || [];

      // Process based on question type
      let processedGroup = {
        id: group.id,
        type: group.type,
        instruction: group.instruction,
        question_range: group.question_range,
        image_url: group.image_url, // For map type
      };

      if (group.type === "multiple_choice") {
        // Multiple choice: questions are stored directly in question table
        // We need to fetch them separately (they're not in the questions table)
        // Each question has its own options
        processedGroup.questions = groupQuestions.map(q => ({
          id: q.id,
          question_number: q.question_number,
          question_text: q.question_text,
          options: (optionsByQuestion[q.id] || []).map(opt => ({
            id: opt.id,
            option_text: opt.option_text,
            is_correct: opt.is_correct, // Only show in review mode
          })),
        }));
      } else if (group.type === "fill_in_blanks" || group.type === "table_completion") {
        // Passage/content is in group.question_text
        // Answers are in questions table
        processedGroup.content = group.question_text;
        processedGroup.questions = groupQuestions
          .filter(q => q.is_correct !== false) // Exclude distractors
          .map(q => ({
            id: q.id,
            question_number: q.question_number,
            question_text: q.question_text, // This is the answer text
            correct_answer: q.correct_answer, // Only in review mode
          }));
      } else if (group.type === "drag_drop") {
        // Passage is in group.question_text
        // Both correct answers and distractors are in questions table
        processedGroup.content = group.question_text;
        processedGroup.questions = groupQuestions.map(q => ({
          id: q.id,
          question_number: q.question_number,
          question_text: q.question_text,
          correct_answer: q.correct_answer, // Only in review mode
          is_correct: q.is_correct,
        }));
      } else if (group.type === "table" || group.type === "map") {
        // Options are shared at group level
        // Questions reference option letters as correct_answer
        processedGroup.options = groupOptions.map(opt => ({
          id: opt.id,
          option_text: opt.option_text, // Letter (A, B, C, D)
          is_correct: opt.is_correct,
        }));
        processedGroup.questions = groupQuestions
          .filter(q => q.is_correct !== false)
          .map(q => ({
            id: q.id,
            question_number: q.question_number,
            question_text: q.question_text,
            correct_answer: q.correct_answer, // Letter (A, B, C, D) - only in review mode
          }));
      } else if (group.type === "matching_information") {
        // Answer options are at group level with option_key
        processedGroup.answer_options = groupOptions.map(opt => ({
          id: opt.id,
          option_key: opt.option_key, // A, B, C, D or 1, 2, 3, 4
          option_text: opt.option_text,
          is_correct: opt.is_correct,
        }));
        processedGroup.questions = groupQuestions
          .filter(q => q.is_correct !== false)
          .map(q => ({
            id: q.id,
            question_number: q.question_number,
            question_text: q.question_text,
            correct_answer: q.correct_answer, // option_key - only in review mode
          }));
      } else {
        // true_false_not_given, yes_no_not_given
        processedGroup.questions = groupQuestions
          .filter(q => q.is_correct !== false)
          .map(q => ({
            id: q.id,
            question_number: q.question_number,
            question_text: q.question_text,
            correct_answer: q.correct_answer, // TRUE/FALSE/NOT GIVEN or YES/NO/NOT GIVEN - only in review mode
          }));
      }

      return processedGroup;
    });

    return {
      ...part,
      question_groups: groups,
    };
  });

  return {
    ...testMetadata,
    parts: processedParts,
  };
}
```

---

## Security Considerations

### 1. Hide Correct Answers During Test-Taking

```javascript
// ❌ WRONG: Don't fetch correct answers during test
const questions = await fetchQuestions(groupIds, true); // includes correct answers

// ✅ CORRECT: Hide answers during test
const questions = await fetchQuestions(groupIds, false); // excludes correct answers
```

### 2. Check Premium Status

```javascript
async function canUserAccessTest(testId, userSubscriptionStatus) {
  const test = await fetchTestMetadata(testId);
  
  if (!test) return false;
  if (!test.is_active) return false;
  
  // Check premium requirement
  if (test.is_premium && userSubscriptionStatus !== "premium") {
    return false;
  }
  
  return true;
}
```

### 3. Validate Test Access

```javascript
// Before fetching full test data, verify user has access
const hasAccess = await canUserAccessTest(testId, user.subscription_status);
if (!hasAccess) {
  throw new Error("You don't have access to this test");
}
```

---

## Complete Example Implementation

Here's a complete function that fetches and processes test data for users:

```javascript
import supabase from '@/lib/supabase'; // Your Supabase client

/**
 * Fetches a complete test for the users website
 * @param {string} testId - The test ID
 * @param {boolean} includeCorrectAnswers - Whether to include correct answers (for review mode)
 * @param {string} userSubscriptionStatus - User's subscription status ("premium" or "free")
 * @returns {Promise<Object|null>} Processed test data or null if error/unauthorized
 */
async function fetchTestForUser(testId, includeCorrectAnswers = false, userSubscriptionStatus = "free") {
  try {
    // Step 1: Fetch test metadata
    const testMetadata = await supabase
      .from("test")
      .select("id, title, duration, difficulty, type, is_premium, is_active, question_quantity, created_at")
      .eq("id", testId)
      .eq("is_active", true)
      .single();

    if (testMetadata.error) {
      console.error("Error fetching test:", testMetadata.error);
      return null;
    }

    const test = testMetadata.data;
    if (!test) return null;

    // Check premium access
    if (test.is_premium && userSubscriptionStatus !== "premium") {
      throw new Error("This test requires a premium subscription");
    }

    // Step 2: Fetch parts
    const { data: parts, error: partsError } = await supabase
      .from("part")
      .select("id, test_id, part_number, title, content, image_url, listening_url")
      .eq("test_id", testId)
      .order("part_number", { ascending: true });

    if (partsError) {
      console.error("Error fetching parts:", partsError);
      return null;
    }

    if (!parts || parts.length === 0) {
      return { ...test, parts: [] };
    }

    const partIds = parts.map(p => p.id);

    // Step 3: Fetch question groups
    const { data: questionGroups, error: groupsError } = await supabase
      .from("question")
      .select("id, test_id, part_id, type, question_range, instruction, question_text, image_url")
      .in("part_id", partIds);

    if (groupsError) {
      console.error("Error fetching question groups:", groupsError);
      return null;
    }

    if (!questionGroups || questionGroups.length === 0) {
      return { ...test, parts: parts.map(p => ({ ...p, question_groups: [] })) };
    }

    const groupIds = questionGroups.map(g => g.id);

    // Step 4: Fetch questions
    let questionsQuery = supabase
      .from("questions")
      .select("id, test_id, question_id, part_id, question_number, question_text, explanation, is_correct");

    if (includeCorrectAnswers) {
      questionsQuery = questionsQuery.select("id, test_id, question_id, part_id, question_number, question_text, correct_answer, explanation, is_correct");
    }

    const { data: questions, error: questionsError } = await questionsQuery
      .in("question_id", groupIds)
      .order("question_number", { ascending: true });

    if (questionsError) {
      console.error("Error fetching questions:", questionsError);
      return null;
    }

    // Step 5: Fetch options
    const { data: options, error: optionsError } = await supabase
      .from("options")
      .select("id, test_id, question_id, part_id, question_number, option_text, option_key, is_correct")
      .in("question_id", groupIds)
      .order("option_text");

    if (optionsError) {
      console.error("Error fetching options:", optionsError);
      return null;
    }

    // Step 6: Process and structure the data
    const processedTest = processTestData(
      test,
      parts || [],
      questionGroups || [],
      questions || [],
      options || []
    );

    return processedTest;
  } catch (error) {
    console.error("Error fetching test for user:", error);
    return null;
  }
}

// Helper function to process the data (see Data Processing section above)
function processTestData(testMetadata, parts, questionGroups, questions, options) {
  // ... (implementation from Data Processing section)
}
```

---

## Error Handling

### Common Errors and Solutions

1. **RLS Policy Error**
   ```
   Error: new row violates row-level security policy
   ```
   **Solution**: Ensure your Supabase RLS policies allow users to read from `test`, `part`, `question`, `questions`, and `options` tables for active tests.

2. **Test Not Found**
   ```javascript
   if (!test) {
     return { error: "Test not found or not active" };
   }
   ```

3. **Premium Access Denied**
   ```javascript
   if (test.is_premium && userSubscriptionStatus !== "premium") {
     return { error: "Premium subscription required" };
   }
   ```

4. **Network/Timeout Errors**
   ```javascript
   try {
     const test = await fetchTestForUser(testId);
   } catch (error) {
     if (error.message.includes("timeout") || error.message.includes("network")) {
       // Retry logic or show user-friendly message
     }
   }
   ```

---

## Performance Optimization

### 1. Batch Queries When Possible

Instead of fetching options for each group separately:

```javascript
// ❌ SLOW: Multiple queries
for (const group of groups) {
  const options = await fetchOptions([group.id]);
}

// ✅ FAST: Single query
const allOptions = await fetchOptions(allGroupIds);
// Then filter in JavaScript
```

### 2. Use Select to Limit Fields

Only fetch fields you need:

```javascript
// ❌ Fetches all fields
.select("*")

// ✅ Only fetches needed fields
.select("id, title, duration, type")
```

### 3. Cache Test Metadata

Test metadata (title, duration, etc.) rarely changes. Cache it:

```javascript
const testCache = new Map();

async function getCachedTestMetadata(testId) {
  if (testCache.has(testId)) {
    return testCache.get(testId);
  }
  const test = await fetchTestMetadata(testId);
  testCache.set(testId, test);
  return test;
}
```

### 4. Lazy Load Parts

If tests have many parts, consider loading parts on-demand:

```javascript
async function fetchPart(partId) {
  // Fetch single part when user navigates to it
}
```

---

## Usage Examples

### Example 1: Fetch Test for Taking (Hide Answers)

```javascript
// User is taking the test - hide correct answers
const test = await fetchTestForUser(testId, false, user.subscription_status);

if (!test) {
  alert("Test not found or you don't have access");
  return;
}

// Display test to user
console.log(test.title);
test.parts.forEach(part => {
  part.question_groups.forEach(group => {
    // Show questions without correct answers
    group.questions.forEach(q => {
      console.log(`Q${q.question_number}: ${q.question_text}`);
      // No correct_answer shown
    });
  });
});
```

### Example 2: Fetch Test for Review (Show Answers)

```javascript
// User is reviewing completed test - show correct answers
const test = await fetchTestForUser(testId, true, user.subscription_status);

if (!test) {
  alert("Test not found");
  return;
}

// Display test with answers
test.parts.forEach(part => {
  part.question_groups.forEach(group => {
    group.questions.forEach(q => {
      console.log(`Q${q.question_number}: ${q.question_text}`);
      console.log(`Correct Answer: ${q.correct_answer}`); // Now visible
    });
  });
});
```

### Example 3: Check Access Before Fetching

```javascript
// Check if user can access test before fetching full data
const testMetadata = await fetchTestMetadata(testId);

if (!testMetadata || !testMetadata.is_active) {
  alert("Test is not available");
  return;
}

if (testMetadata.is_premium && user.subscription_status !== "premium") {
  alert("Premium subscription required");
  return;
}

// Now fetch full test data
const fullTest = await fetchTestForUser(testId, false, user.subscription_status);
```

---

## Summary

### Key Takeaways

1. **Don't use admin `getTestById`** - It requires admin permissions and may expose sensitive data
2. **Use separate queries** - Fetch test, parts, groups, questions, and options separately
3. **Respect RLS policies** - Ensure your queries work with user-level permissions
4. **Hide answers during test-taking** - Only show correct answers in review mode
5. **Check premium access** - Verify user subscription before fetching premium tests
6. **Process data by type** - Different question types need different processing logic
7. **Handle errors gracefully** - Provide user-friendly error messages

### Quick Reference

```javascript
// Basic usage
const test = await fetchTestForUser(testId, false, "free");

// With error handling
try {
  const test = await fetchTestForUser(testId, false, user.subscription_status);
  if (!test) {
    throw new Error("Test not found");
  }
  // Use test data
} catch (error) {
  console.error("Failed to load test:", error);
  // Show error to user
}
```

---

## Additional Resources

- See `type_db/full_db.md` for complete database schema
- See `src/stores/testStore.js` for admin implementation (reference only)
- See `src/pages/ContentFormPage.jsx` for data processing examples
- See individual type documentation in `type_db/` folder for question type specifics

