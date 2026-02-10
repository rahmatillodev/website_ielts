# Mock Test Writing Section - Complete Documentation

## Overview

This document describes the complete implementation of the Writing section in the Mock Test flow. The Writing section allows users to complete Task 1 and Task 2 writing tasks within a 60-minute time limit, with automatic timer start and no interruptions after the intro video.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Component Structure](#component-structure)
3. [Flow Diagram](#flow-diagram)
4. [Key Features](#key-features)
5. [Data Flow](#data-flow)
6. [Database Schema](#database-schema)
7. [State Management](#state-management)
8. [Error Handling](#error-handling)
9. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

The Writing section follows a similar pattern to Listening and Reading sections:

1. **MockTestWriting** - Wrapper component that shows intro video and manages security
2. **WritingPracticePage** - Main practice page that handles writing tasks and timer
3. **writingCompletedStore** - Zustand store for saving writing attempts
4. **mockTestClientStore** - Zustand store for managing mock test client status

---

## Component Structure

### 1. MockTestWriting Component

**File**: `src/pages/dashboard/mock/MockTestWriting.jsx`

**Props**:
- `writingId`: Writing test ID
- `mockTestId`: Mock test ID
- `mockClientId`: Mock test client ID (for user_attempts table)
- `onComplete(result)`: Called when section completes
- `onBack()`: Called on exit attempt

**Responsibilities**:
1. Shows 30-second instructional video (`InstructionalVideo` component)
2. Updates URL to `/writing-practice/${writingId}?mockTest=true&mockTestId=${mockTestId}&mockClientId=${mockClientId}&duration=3600`
3. Waits for URL to be ready before rendering `WritingPracticePage`
4. Polls localStorage for completion signal
5. Handles exit modal and security restrictions

**Completion Detection**:
- Polls `localStorage.getItem('mock_test_${mockTestId}_writing_completed')`
- Reads result from `localStorage.getItem('mock_test_${mockTestId}_writing_result')`
- Calls `onComplete()` with parsed result

**Key Code**:
```javascript
// Listen for completion from practice page
useEffect(() => {
  const checkCompletion = setInterval(() => {
    const completed = localStorage.getItem(`mock_test_${mockTestId}_writing_completed`);
    if (completed === 'true') {
      const result = localStorage.getItem(`mock_test_${mockTestId}_writing_result`);
      if (result && onComplete) {
        try {
          onComplete(JSON.parse(result));
          localStorage.removeItem(`mock_test_${mockTestId}_writing_completed`);
          localStorage.removeItem(`mock_test_${mockTestId}_writing_result`);
        } catch (e) {
          console.error('Error parsing writing result:', e);
        }
      }
      clearInterval(checkCompletion);
    }
  }, 1000);

  return () => clearInterval(checkCompletion);
}, [mockTestId, onComplete]);
```

---

### 2. WritingPracticePage Component

**File**: `src/pages/dashboard/writing/WritingPracticePage.jsx`

**Mock Test Mode Detection**:
```javascript
const urlSearchParams = React.useMemo(() => new URLSearchParams(window.location.search), []);
const isMockTest = React.useMemo(() => 
  searchParams.get('mockTest') === 'true' || urlSearchParams.get('mockTest') === 'true',
  [searchParams, urlSearchParams]
);
const mockTestId = React.useMemo(() => 
  searchParams.get('mockTestId') || urlSearchParams.get('mockTestId'),
  [searchParams, urlSearchParams]
);
const mockClientId = React.useMemo(() => 
  searchParams.get('mockClientId') || urlSearchParams.get('mockClientId'),
  [searchParams, urlSearchParams]
);
```

**Key Features**:

1. **Auto-Start Timer** (Mock Test Mode):
   - Timer starts automatically when entering the page (no button needed)
   - Duration: 60 minutes (3600 seconds) from URL param or writing duration
   - No interruption after intro video
   - Timer cannot be paused in mock test mode

2. **Feedback Hidden**:
   - Feedback section is completely hidden in mock test mode
   - Only task content and image are shown

3. **Data Entry**:
   - User enters text for Task 1 and Task 2
   - Answers are stored in state: `{ "Task 1": "...", "Task 2": "..." }`
   - Word count is displayed for each task

4. **Auto-Submit on Time Expiry**:
   - When timer reaches 0, automatically submits writing
   - No loading overlay during auto-submit
   - Signals completion via localStorage

5. **Manual Finish**:
   - User can click "Finish Writing" button
   - Validates that both tasks have at least one word
   - Shows finish confirmation modal
   - Submits and signals completion

**Initialization Logic** (Mock Test Mode):
```javascript
// Mock test mode: Auto-start timer immediately (no button needed)
if (isMockTest && !isReviewMode) {
  // Get duration from URL param (in seconds) or use writing duration
  const durationParam = searchParams.get('duration') || urlSearchParams.get('duration');
  const durationInSeconds = durationParam 
    ? parseInt(durationParam, 10) 
    : convertDurationToSeconds(currentWriting.duration);

  // Initialize answers if not set
  if (Object.keys(answers).length === 0) {
    const init = {};
    tasks.forEach((t) => (init[t.task_name] = ""));
    setAnswers(init);
  }

  // Auto-start timer
  setIsPracticeMode(true);
  setIsStarted(true);
  setIsPaused(false);
  setTimeRemaining(durationInSeconds);
  setElapsedTime(0);
  setStartTime(Date.now());

  // Update mock_test_clients status to 'started' if not already started
  if (mockClientId) {
    updateClientStatus(mockClientId, 'started').catch(err => {
      console.error('Error updating mock test client status to started:', err);
    });
  }

  return; // Skip normal localStorage loading for mock test
}
```

---

### 3. writingCompletedStore

**File**: `src/store/writingCompletedStore.js`

**submitWritingAttempt Function**:
```javascript
submitWritingAttempt: async (writingId, answers, timeTaken, mockClientId = null)
```

**Parameters**:
- `writingId`: Writing test ID
- `answers`: Object with task answers `{ "Task 1": "...", "Task 2": "..." }`
- `timeTaken`: Time taken in seconds
- `mockClientId`: Optional mock test client ID (for mock test mode)

**Process**:
1. Combines all task answers into a single string:
   ```
   "Task 1: [answer]\n\nTask 2: [answer]"
   ```
2. Inserts into `user_attempts` table:
   - `user_id`: Current user ID
   - `writing_id`: Writing test ID
   - `score`: `null` (writing doesn't have automated scoring)
   - `total_questions`: `1` (constant)
   - `correct_answers`: Combined task answers text
   - `time_taken`: Time taken in seconds (minimum 1 second)
   - `completed_at`: Current timestamp
   - `mock_id`: `mockClientId` (if provided, for mock test mode)

3. Returns:
   ```javascript
   {
     success: true,
     attemptId: string
   }
   ```

**Error Handling**:
- If `writing_id` column doesn't exist, falls back to `test_id`
- Handles authentication errors
- Returns error message on failure

---

### 4. mockTestClientStore

**File**: `src/store/mockTestClientStore.js`

**updateClientStatus Function**:
```javascript
updateClientStatus: async (clientId, status)
```

**Parameters**:
- `clientId`: Mock test client ID
- `status`: New status (`'booked' | 'started' | 'completed'`)

**Process**:
1. Updates `mock_test_clients` table:
   - Sets `status` to new value
   - Updates `updated_at` timestamp
2. Updates local client state if it matches
3. Returns `{ success: true }` or `{ success: false, error: string }`

**Usage**:
- Called when writing section starts: `updateClientStatus(mockClientId, 'started')`
- Called when writing section completes: `updateClientStatus(mockClientId, 'completed')`

---

## Flow Diagram

```
MockTestFlow
    ↓
MockTestWriting (shows intro video)
    ↓
WritingPracticePage (auto-starts timer)
    ↓
User writes Task 1 and Task 2
    ↓
[Timer expires OR User clicks Finish]
    ↓
handleAutoSubmit() OR handleSubmitFinish()
    ↓
submitWritingAttempt(id, answers, timeTaken, mockClientId)
    ↓
Save to user_attempts (with mock_id)
    ↓
Update mock_test_clients.status = 'completed'
    ↓
Signal completion via localStorage
    ↓
MockTestWriting detects completion
    ↓
onComplete() → MockTestFlow
    ↓
MockTestResults
```

---

## Key Features

### 1. No Feedback in Mock Test

**Implementation**:
```javascript
{/* feedback */}
{/* Hide feedback in mock test mode */}
{!isMockTest && !isPracticeMode ? (
  taskToDisplay.feedback && (
    <div>...</div>
  )
) : !isMockTest && isPracticeMode ? (
  <div>Feedback not available yet...</div>
) : null}
```

**Behavior**:
- Feedback section is completely hidden when `isMockTest === true`
- Only task content and image are displayed
- No feedback message shown

---

### 2. Auto-Start Timer

**Implementation**:
- Timer starts automatically when `WritingPracticePage` loads in mock test mode
- No "Try Practice" button needed
- Timer cannot be paused
- Duration: 60 minutes (3600 seconds)

**Code**:
```javascript
if (isMockTest && !isReviewMode) {
  setIsPracticeMode(true);
  setIsStarted(true);
  setIsPaused(false);
  setTimeRemaining(durationInSeconds);
  setStartTime(Date.now());
}
```

---

### 3. Data Storage

**user_attempts Table**:
```sql
INSERT INTO user_attempts (
  user_id,
  writing_id,
  score,              -- NULL (no automated scoring)
  total_questions,    -- 1 (constant)
  correct_answers,     -- "Task 1: [answer]\n\nTask 2: [answer]"
  time_taken,         -- seconds
  completed_at,
  mock_id             -- mock_test_clients.id (if mock test)
)
```

**mock_test_clients Table**:
```sql
UPDATE mock_test_clients
SET status = 'started' | 'completed',
    updated_at = NOW()
WHERE id = mockClientId
```

---

### 4. Completion Signaling

**Process**:
1. After successful submission, WritingPracticePage sets:
   ```javascript
   localStorage.setItem(`mock_test_${mockTestId}_writing_completed`, 'true');
   localStorage.setItem(`mock_test_${mockTestId}_writing_result`, JSON.stringify({
     success: true,
     attemptId: result.attemptId,
   }));
   ```

2. MockTestWriting polls localStorage every second:
   ```javascript
   const completed = localStorage.getItem(`mock_test_${mockTestId}_writing_completed`);
   if (completed === 'true') {
     const result = localStorage.getItem(`mock_test_${mockTestId}_writing_result`);
     onComplete(JSON.parse(result));
     // Clean up
     localStorage.removeItem(`mock_test_${mockTestId}_writing_completed`);
     localStorage.removeItem(`mock_test_${mockTestId}_writing_result`);
   }
   ```

3. MockTestFlow receives completion and navigates to results:
   ```javascript
   const handleWritingComplete = (result) => {
     setSectionResults({ ...sectionResults, writing: result });
     clearMockTestData(effectiveMockTestId);
     setCurrentSection('results');
   };
   ```

---

## Data Flow

### 1. Initialization
```
MockTestFlow → MockTestWriting → InstructionalVideo (30s)
    ↓
WritingPracticePage loads
    ↓
Detects mock test mode from URL params
    ↓
Auto-starts timer (60 minutes)
    ↓
Updates mock_test_clients.status = 'started'
```

### 2. User Input
```
User types in Task 1 textarea
    ↓
answers state updates: { "Task 1": "..." }
    ↓
User types in Task 2 textarea
    ↓
answers state updates: { "Task 1": "...", "Task 2": "..." }
```

### 3. Submission
```
[Timer expires OR User clicks Finish]
    ↓
handleAutoSubmit() OR handleSubmitFinish()
    ↓
submitWritingAttempt(id, answers, timeTaken, mockClientId)
    ↓
Save to user_attempts (with mock_id)
    ↓
Update mock_test_clients.status = 'completed'
    ↓
Set localStorage completion signal
    ↓
MockTestWriting detects completion
    ↓
onComplete() → MockTestFlow → MockTestResults
```

---

## Database Schema

### user_attempts Table
```sql
CREATE TABLE user_attempts (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  writing_id UUID,              -- Writing test ID
  test_id UUID,                -- Fallback if writing_id doesn't exist
  score INTEGER,               -- NULL for writing (no automated scoring)
  total_questions INTEGER,      -- 1 (constant for writing)
  correct_answers TEXT,        -- "Task 1: [answer]\n\nTask 2: [answer]"
  time_taken INTEGER,         -- Seconds
  completed_at TIMESTAMP,
  mock_id UUID,                -- References mock_test_clients.id
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### mock_test_clients Table
```sql
CREATE TABLE mock_test_clients (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone_number TEXT,
  date DATE,
  time TIME,
  status mock_test_client_status NOT NULL DEFAULT 'booked',
  -- Values: 'booked' | 'started' | 'completed'
  total_score INTEGER,         -- 0-9 (IELTS band score)
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

**Status Flow**:
- `'booked'` → Initial status when mock test is booked
- `'started'` → Set when writing section starts
- `'completed'` → Set when writing section completes

---

## State Management

### WritingPracticePage State

**Practice Mode States**:
- `isPracticeMode`: `true` in mock test mode (auto-set)
- `isStarted`: `true` in mock test mode (auto-set)
- `isPaused`: `false` in mock test mode (cannot pause)
- `timeRemaining`: Countdown in seconds (3600 for 60 minutes)
- `startTime`: Timestamp when timer started
- `elapsedTime`: Elapsed time in seconds

**Answer State**:
- `answers`: `{ "Task 1": "...", "Task 2": "..." }`

**Modal States**:
- `isFinishModalOpen`: Finish confirmation modal
- `isSuccessModalOpen`: Success modal (not shown in mock test)
- `isSaving`: Saving state
- `isAutoSubmitting`: Auto-submit state

---

## Error Handling

### 1. Authentication Error
```javascript
if (!userId) {
  throw new Error('User not authenticated');
}
```

### 2. Missing Writing ID
```javascript
if (!writingId) {
  throw new Error('Writing ID is required');
}
```

### 3. Database Error (writing_id column)
```javascript
if (attemptError.message.includes('writing_id') || attemptError.code === '42703') {
  // Fallback to test_id
  const retryData = await supabase
    .from('user_attempts')
    .insert({ test_id: writingId, ... })
}
```

### 4. Submission Failure
```javascript
if (!result.success) {
  toast.error(result.error || 'Failed to save writing attempt');
  // Resume practice mode if save failed
  setIsPaused(false);
  setIsStarted(true);
}
```

---

## Troubleshooting

### Issue: Timer doesn't start automatically

**Possible Causes**:
1. Mock test mode not detected (check URL params)
2. `isMockTest` is `false`
3. `currentWriting` not loaded yet

**Solution**:
- Verify URL contains `?mockTest=true&mockTestId=...&mockClientId=...&duration=3600`
- Check that `currentWriting` is loaded before initialization
- Ensure `isMockTest` is correctly computed

---

### Issue: Feedback still showing

**Possible Causes**:
1. `isMockTest` is `false`
2. Condition logic error

**Solution**:
- Verify `isMockTest` is `true` in mock test mode
- Check feedback rendering condition: `{!isMockTest && !isPracticeMode ? ... : null}`

---

### Issue: Data not saving to user_attempts

**Possible Causes**:
1. `mockClientId` not passed to `submitWritingAttempt`
2. Database constraint error
3. Authentication error

**Solution**:
- Verify `mockClientId` is extracted from URL params
- Check that `mockClientId` is passed to `submitWritingAttempt`
- Verify user is authenticated
- Check database logs for constraint errors

---

### Issue: Completion not detected

**Possible Causes**:
1. localStorage keys not set correctly
2. Polling interval not running
3. Key mismatch between WritingPracticePage and MockTestWriting

**Solution**:
- Verify localStorage keys match:
  - `mock_test_${mockTestId}_writing_completed`
  - `mock_test_${mockTestId}_writing_result`
- Check that polling interval is running in MockTestWriting
- Ensure `mockTestId` is consistent between components

---

### Issue: Status not updating to 'started' or 'completed'

**Possible Causes**:
1. `mockClientId` is null or undefined
2. `updateClientStatus` function error
3. Database permission error

**Solution**:
- Verify `mockClientId` is extracted from URL params
- Check that `updateClientStatus` is called with correct parameters
- Verify database permissions for `mock_test_clients` table
- Check console for error messages

---

## Testing Checklist

- [ ] Intro video shows for 30 seconds
- [ ] Timer starts automatically after video
- [ ] Timer shows 60 minutes countdown
- [ ] User can type in Task 1 textarea
- [ ] User can type in Task 2 textarea
- [ ] Word count updates correctly
- [ ] Feedback is hidden in mock test mode
- [ ] Auto-submit works when timer expires
- [ ] Manual finish works when clicking "Finish Writing"
- [ ] Data saves to user_attempts with mock_id
- [ ] mock_test_clients.status updates to 'started' on start
- [ ] mock_test_clients.status updates to 'completed' on finish
- [ ] Completion signal is set in localStorage
- [ ] MockTestWriting detects completion
- [ ] Navigation to results page works

---

## Future Enhancements

1. **Progress Persistence**: Save writing progress to localStorage during mock test (currently skipped)
2. **Word Count Validation**: Enforce minimum word count (150 for Task 1, 250 for Task 2) before allowing finish
3. **Auto-save**: Periodically save answers to prevent data loss
4. **Time Warnings**: Show warnings at 10 minutes, 5 minutes, and 1 minute remaining

---

## Related Files

- `src/pages/dashboard/mock/MockTestWriting.jsx` - Wrapper component
- `src/pages/dashboard/mock/MockTestFlow.jsx` - Main flow orchestrator
- `src/pages/dashboard/writing/WritingPracticePage.jsx` - Main practice page
- `src/store/writingCompletedStore.js` - Writing attempt store
- `src/store/mockTestClientStore.js` - Mock test client store
- `src/components/mock/InstructionalVideo.jsx` - Intro video component
- `src/store/LocalStorage/mockTestStorage.js` - Mock test localStorage utilities

---

## Version History

- **v1.0** (Current): Initial implementation with auto-start timer, no feedback, and status updates

---

## Notes

- Writing section does NOT use localStorage for progress persistence in mock test mode (unlike listening/reading)
- Timer cannot be paused in mock test mode
- Feedback is completely hidden in mock test mode (not just unavailable)
- Status updates are fire-and-forget (errors are logged but don't block submission)

