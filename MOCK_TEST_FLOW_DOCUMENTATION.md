# Mock Test Flow Documentation

## Overview
This document describes the complete mock test flow architecture, including component structure, state management, and data flow. Use this as a reference when debugging or making changes to the mock test system.

## Flow Sequence

### 1. Entry Point: MockTestsPage
**File**: `src/pages/dashboard/mock/MockTestsPage.jsx`

**Flow**:
1. User enters password code
2. Validates password via `fetchMockTestByPassword`
3. Shows `MockTestStart` component for device check
4. After device check, navigates to `/mock-test/flow/${mockTest.id}`

**Key State**:
- `passwordCode`: User-entered password
- `showStartModal`: Controls MockTestStart visibility
- `mockTest`: Fetched mock test configuration

---

### 2. Device Check: MockTestStart
**File**: `src/pages/dashboard/mock/MockTestStart.jsx`

**Purpose**: Tests microphone and speaker before test begins

**Features**:
- Microphone level detection
- Speaker test (with Web Audio API fallback)
- Blocks progression until both tests pass

**Callback**: `onStart()` - Called when "Start Full Test" is clicked

---

### 3. Main Orchestrator: MockTestFlow
**File**: `src/pages/dashboard/mock/MockTestFlow.jsx`

**Purpose**: Manages the entire mock test flow sequence

**State Management**:
```javascript
currentSection: 'audioCheck' | 'intro' | 'listening' | 'reading' | 'writing' | 'results'
showIntroVideo: boolean
audioCheckComplete: boolean
sectionResults: { listening, reading, writing }
```

**Flow Sequence**:
1. **audioCheck** → Shows `MockTestStart`
2. **intro** → Shows `InstructionalVideo` (after audio check)
3. **listening** → Shows `MockTestListening` wrapper
4. **reading** → Shows `MockTestReading` wrapper
5. **writing** → Shows `MockTestWriting` wrapper
6. **results** → Shows `MockTestResults`

**Key Handlers**:
- `handleAudioCheckComplete()`: Sets `audioCheckComplete = true`, `showIntroVideo = true`, `currentSection = 'intro'`
- `handleIntroVideoStart()`: Updates `mock_test_clients` status to `'started'` and sets `mock_test_id` to link client to the test
- `handleIntroVideoComplete()`: Sets `currentSection = 'listening'`
- `handleListeningComplete(result)`: Saves result, sets `currentSection = 'reading'`
- `handleReadingComplete(result)`: Saves result, sets `currentSection = 'writing'`
- `handleWritingComplete(result)`: Saves result, clears storage, sets `currentSection = 'results'`

**LocalStorage Persistence**:
- Saves progress after each section completion
- Restores progress on page refresh
- Clears data after writing section completes

---

### 4. Section Wrappers

#### MockTestListening
**File**: `src/pages/dashboard/mock/MockTestListening.jsx`

**Props**:
- `testId`: Listening test ID
- `mockTestId`: Mock test ID
- `mockClientId`: Mock test client ID (for user_attempts table)
- `onComplete(result)`: Called when section completes
- `onBack()`: Called on exit attempt

**Responsibilities**:
1. Updates URL to `/listening-practice/${testId}?mockTest=true&mockTestId=${mockTestId}&mockClientId=${mockClientId}&duration=2400`
2. Waits for URL to be ready before rendering `ListeningPracticePage`
3. Polls localStorage for completion signal
4. Handles exit modal and security restrictions

**Completion Detection**:
- Polls `localStorage.getItem('mock_test_${mockTestId}_listening_completed')`
- Reads result from `localStorage.getItem('mock_test_${mockTestId}_listening_result')`
- Calls `onComplete()` with parsed result

#### MockTestReading / MockTestWriting
**Similar structure to MockTestListening**
- Show instructional video first (30 second countdown)
- Then render practice page
- Handle completion via localStorage polling

---

### 5. Practice Pages

#### ListeningPracticePage
**File**: `src/pages/dashboard/listening/ListeningPracticePage.jsx`

**Mock Test Mode Detection**:
```javascript
const isMockTest = searchParams.get('mockTest') === 'true' || 
                   new URLSearchParams(window.location.search).get('mockTest') === 'true';
const mockTestId = searchParams.get('mockTestId') || urlSearchParams.get('mockTestId');
const mockClientId = searchParams.get('mockClientId') || urlSearchParams.get('mockClientId');
```

**Test ID Extraction**:
- First tries `useParams()` → `id`
- Falls back to URL path extraction: `/listening-practice/([^\/\?]+)/`
- Uses `effectiveTestId` throughout component

**Timer Auto-Start (Mock Test)**:
1. When `currentTest` loads and `isMockTest === true`:
   - Sets `timeRemaining` from URL `duration` param (2400 seconds = 40 minutes)
   - Sets `isStarted = true`, `isPaused = false`, `hasInteracted = true`
   - Sets `startTime = Date.now()`

2. Timer countdown interval:
   - Runs when: `isStarted === true && !isPaused && hasInteracted === true && timeRemaining !== null`
   - Decrements `timeRemaining` every 1000ms
   - Auto-submits when `timeRemaining === 0`

**Mock Test Restrictions**:
- Back button hidden: `onBack={isMockTest ? undefined : handleBack}`
- Sidebar hidden: `{!isMockTest && <NoteSidebar />}`
- Start/Pause buttons hidden in `QuestionHeader` when `isMockTest === true`

**Submission (Mock Test)**:
```javascript
const mockTestContext = isMockTest && mockClientId ? {
  mockTestId: mockTestId,
  mockClientId: mockClientId,
  section: 'listening'
} : null;

const result = await submitTestAttempt(effectiveTestId, answers, currentTest, timeTaken, 'listening', mockTestContext);
```

**Completion Signal**:
After successful submission:
```javascript
localStorage.setItem(`mock_test_${mockTestId}_listening_completed`, 'true');
localStorage.setItem(`mock_test_${mockTestId}_listening_result`, JSON.stringify({
  success: true,
  attemptId: result.attemptId,
  score: result.score,
  correctCount: result.correctCount,
  totalQuestions: result.totalQuestions,
}));
```

---

### 6. Data Submission

#### testAttempts.js
**File**: `src/lib/testAttempts.js`

**Function**: `submitTestAttempt(testId, answers, currentTest, timeTaken, type, mockTestContext)`

**Mock Test Context**:
```javascript
if (mockTestContext && mockTestContext.mockClientId) {
  attemptDataToInsert.mock_id = mockTestContext.mockClientId; // References mock_test_clients.id
}
```

**Database Tables**:
1. **user_attempts**:
   - `mock_id`: References `mock_test_clients.id`
   - `test_id`: Test ID
   - `score`: Band score (0-9)
   - `time_taken`: Seconds

2. **user_answers**:
   - `attempt_id`: References `user_attempts.id`
   - `question_id`: Question UUID
   - `user_answer`: User's answer
   - `is_correct`: Boolean
   - `correct_answer`: Correct answer

3. **mock_test_clients**:
   - `id`: Primary key (UUID)
   - `user_id`: References `auth.users(id)`
   - `mock_test_id`: **References `mock_test(id)`** - Direct link to the mock test
   - `status`: Status enum ('booked', 'started', 'completed', 'checked', 'notified')
   - `total_score`: Overall band score (0-9)
   - `speaking_id`: Optional reference to speaking test
   - `full_name`, `email`, `phone_number`: User information
   - `created_at`, `updated_at`: Timestamps

**Key Change**: The `mock_test_id` field directly links clients to mock tests, simplifying queries. When status is updated to `'started'`, the `mock_test_id` is automatically set.

---

### 7. Security Features

#### useMockTestSecurity Hook
**File**: `src/hooks/useMockTestSecurity.js`

**Features**:
- Prevents fullscreen exit
- Disables hotkeys (copy, paste, etc.)
- Shows exit modal on tab switch/close attempt
- Blocks browser navigation

**Usage**: Applied in all section wrappers (`MockTestListening`, `MockTestReading`, `MockTestWriting`)

---

### 8. InstructionalVideo Component
**File**: `src/components/mock/InstructionalVideo.jsx`

**Props**:
- `youtubeUrl`: Optional YouTube URL
- `videoSrc`: Local video file path
- `onComplete()`: Called when video ends
- `countdownSeconds`: Countdown after video ends
- `autoFullscreen`: Auto-enter fullscreen
- `onExit()`: Developer exit callback

**Features**:
- Supports YouTube and local videos
- Auto-fullscreen mode (cannot exit)
- Developer hotkey: `Ctrl+Shift+Q` / `Cmd+Shift+Q`
- Countdown after video completion

---

## Common Issues & Solutions

### Issue 1: Timer Not Counting Down / Timer Resets to 40:00
**Symptoms**: Timer counts down by 1 second then jumps back to 40:00, or timer doesn't count down at all

**Root Cause**:
The initialization effect had `timeRemaining` in its dependency array, causing it to reset every time the timer decremented.

**Solution**:
1. Use `timerInitializedRef` to track if timer has been initialized
2. Remove `timeRemaining` from initialization effect dependencies
3. Remove `timeRemaining` from timer interval dependencies (use functional update instead)
4. Only initialize once per test load

**Fixed Code Pattern**:
```javascript
// Use ref to prevent reset loops
const timerInitializedRef = useRef(false);

// Initialize only once
useEffect(() => {
  if (!currentTest || timerInitializedRef.current) return;
  setTimeRemaining(durationInSeconds);
  timerInitializedRef.current = true;
}, [currentTest, isMockTest]); // NO timeRemaining in deps!

// Timer interval uses functional update
useEffect(() => {
  if (!isStarted || isPaused || !hasInteracted) return;
  const interval = setInterval(() => {
    setTimeRemaining(prev => prev - 1); // Functional update
  }, 1000);
  return () => clearInterval(interval);
}, [isStarted, isPaused, hasInteracted]); // NO timeRemaining in deps!
```

**Debug Checklist**:
```javascript
console.log('Timer State:', {
  isStarted,
  isPaused,
  hasInteracted,
  timeRemaining,
  startTime,
  isMockTest,
  timerInitialized: timerInitializedRef.current
});
```

### Issue 2: InstructionalVideo Not Showing
**Symptoms**: Video doesn't appear after audio check

**Causes**:
1. `showIntroVideo` not set to `true`
2. `audioCheckComplete` not set to `true`
3. `currentSection` not set to `'intro'`
4. Condition check fails

**Solution**:
- Check `handleAudioCheckComplete()` sets all three states
- Verify condition: `(showIntroVideo || currentSection === 'intro') && audioCheckComplete`

**Debug Checklist**:
```javascript
console.log('Video State:', {
  showIntroVideo,
  audioCheckComplete,
  currentSection
});
```

### Issue 3: Test ID Not Found / Login Error
**Symptoms**: "Invalid test ID" error on login, but works after refresh

**Causes**:
1. URL not updated before component reads it
2. `useParams()` not updating after `history.replaceState`
3. Timing issue: component renders before URL is ready
4. Login state not fully initialized when component mounts

**Solution**:
- Ensure `MockTestListening` updates URL before rendering `ListeningPracticePage`
- Use `effectiveTestId` that extracts from URL path as fallback
- Add loading state until URL is ready
- Add retry logic for mock test mode (500ms delay)
- Use `requestAnimationFrame` to ensure URL update is processed

**Fixed Code Pattern**:
```javascript
// In MockTestListening
useEffect(() => {
  if (!testId) return;
  window.history.replaceState({}, '', newUrl);
  requestAnimationFrame(() => {
    setUrlReady(true); // Ensures React Router processes the change
  });
}, [testId]);

// In ListeningPracticePage
if (isMockTest && !testIdToUse) {
  // Retry after short delay for login timing issues
  setTimeout(() => {
    const retryId = getEffectiveTestId();
    if (retryId) { /* retry loading */ }
  }, 500);
  return;
}
```

### Issue 4: Mock Test Mode Not Detected
**Symptoms**: Back button visible, sidebar visible, timer doesn't auto-start

**Causes**:
1. `searchParams.get('mockTest')` returns `null`
2. URL not updated with `mockTest=true` param

**Solution**:
- Check both `searchParams` and `window.location.search`
- Verify URL includes `?mockTest=true&mockTestId=...&mockClientId=...&duration=2400`

### Issue 5: Rules of Hooks Violation
**Symptoms**: "Rendered more hooks than during the previous render" error

**Causes**:
1. Early return (`if` statement) before all hooks are called
2. Conditional hook calls
3. Hooks called inside loops or conditions

**Solution**:
- **ALWAYS call all hooks before any conditional returns**
- Move all `useEffect`, `useState`, `useRef`, etc. to the top of the component
- Only use conditional returns AFTER all hooks have been called

**Example (WRONG)**:
```javascript
const Component = () => {
  const [state, setState] = useState(false);
  
  if (state) {
    return <div>Early return</div>; // ❌ BAD: Before useEffect
  }
  
  useEffect(() => { /* ... */ }, []); // ❌ This hook won't run when state is true
  return <div>Normal</div>;
};
```

**Example (CORRECT)**:
```javascript
const Component = () => {
  const [state, setState] = useState(false);
  
  useEffect(() => { /* ... */ }, []); // ✅ GOOD: All hooks first
  
  if (state) {
    return <div>Early return</div>; // ✅ OK: After all hooks
  }
  
  return <div>Normal</div>;
};
```

---

## State Flow Diagram

```
MockTestsPage
  ↓ (password + device check)
MockTestFlow (currentSection: 'audioCheck')
  ↓ (audio check complete)
MockTestFlow (currentSection: 'intro', showIntroVideo: true)
  ↓ (video starts → updates mock_test_clients.status = 'started', sets mock_test_id)
  ↓ (video complete)
MockTestFlow (currentSection: 'listening')
  ↓
MockTestListening
  ↓ (updates URL)
ListeningPracticePage
  ↓ (auto-starts timer, user takes test)
  ↓ (submission)
localStorage.setItem('mock_test_${mockTestId}_listening_completed', 'true')
  ↓ (polling detects completion)
MockTestListening.onComplete()
  ↓
MockTestFlow (currentSection: 'reading')
  ↓ (similar flow for reading/writing)
MockTestFlow (currentSection: 'results')
```

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `MockTestsPage.jsx` | Entry point, password validation |
| `MockTestStart.jsx` | Device check (mic/speaker) |
| `MockTestFlow.jsx` | Main orchestrator |
| `MockTestListening.jsx` | Listening section wrapper |
| `MockTestReading.jsx` | Reading section wrapper |
| `MockTestWriting.jsx` | Writing section wrapper |
| `ListeningPracticePage.jsx` | Listening practice page (adapted for mock test) |
| `QuestionHeader.jsx` | Header component (hides back/start/pause in mock test) |
| `InstructionalVideo.jsx` | Video component with fullscreen |
| `useMockTestSecurity.js` | Security hook |
| `testAttempts.js` | Submission logic |
| `mockTestStorage.js` | LocalStorage utilities |

---

## Testing Checklist

- [ ] Audio check completes and shows video
- [ ] Video plays and auto-fullscreen works
- [ ] Video completion triggers listening section
- [ ] Timer auto-starts when listening section loads
- [ ] Timer counts down correctly
- [ ] Back button hidden in mock test mode
- [ ] Sidebar hidden in mock test mode
- [ ] Start/Pause buttons hidden in mock test mode
- [ ] Submission saves to `user_attempts` with `mock_id`
- [ ] Submission saves to `user_answers`
- [ ] Completion signal triggers next section
- [ ] Reading section shows video first
- [ ] Writing section shows video first
- [ ] Results page displays all section results

---

## Notes

- All mock test URLs include `?mockTest=true` parameter
- Duration for listening: 2400 seconds (40 minutes)
- Duration for reading/writing: From test configuration
- Timer auto-starts only in mock test mode
- LocalStorage is used for completion signaling between components
- Security restrictions apply throughout mock test flow
- **Client-to-Test Relationship**: The `mock_test_clients.mock_test_id` field directly links clients to mock tests, simplifying queries. This field is set when the status is updated to `'started'` (when intro video starts). All client lookups now use `mock_test_id` instead of matching via `user_attempts`.

