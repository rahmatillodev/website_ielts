/**
 * Shared IndexedDB mock archive viewer: question snapshot + user answers only (sanitized; no correct keys).
 */
import { sanitizeRunForDisplay, pickFlatUserAnswer } from '@/lib/mockTestIndexedArchive';

export function lookupUserAnswer(answers, row) {
  if (!answers || typeof answers !== 'object') return null;
  const id = row.questionId || row.taskName;
  if (id != null && id !== '') {
    const entry = answers[id];
    if (entry != null && typeof entry === 'object' && 'user_answer' in entry) {
      const ua = entry.user_answer;
      if (ua != null && String(ua).trim() !== '') return String(ua).trim();
      return null;
    }
  }
  if (row.taskName && answers[row.taskName] != null) {
    const entry = answers[row.taskName];
    if (typeof entry === 'object' && entry != null && 'user_answer' in entry) {
      const ua = entry.user_answer;
      if (ua != null && String(ua).trim() !== '') return String(ua).trim();
      return null;
    }
  }
  // Legacy flat key-value rows
  return pickFlatUserAnswer(answers, row);
}

function SectionBlock({ title, section, listMaxHeightClass }) {
  if (!section) {
    return <p className="text-sm text-gray-500">No data for {title}.</p>;
  }
  const rows = section.questionsIndex || [];
  const answersObj = section.answers || {};

  if (rows.length === 0) {
    return (
      <div className="text-sm text-gray-600 space-y-2">
        {section.testId && <p>Test ID: {section.testId}</p>}
        <p>No question snapshot rows (answer keys: {Object.keys(answersObj).length}).</p>
      </div>
    );
  }

  return (
    <div className={`space-y-3 overflow-y-auto pr-1 ${listMaxHeightClass}`}>
      {rows.map((row, idx) => {
        const userAnswer = lookupUserAnswer(answersObj, row);
        const numLabel =
          row.questionNumber != null
            ? `Question ${row.questionNumber}`
            : row.taskName
              ? `Question ${idx + 1}`
              : `Row ${idx + 1}`;
        return (
          <div key={`${numLabel}-${idx}`} className="border-b border-gray-100 pb-2 text-left text-sm">
            <div className="font-semibold text-gray-800">{numLabel}</div>
            {row.questionText && (
              <div className="text-gray-600 mt-0.5 whitespace-pre-wrap wrap-break-word">
                {row.questionText}
              </div>
            )}
            <div className="mt-1 text-brand-900">
              <span className="font-medium">Your answer: </span>
              <span className={userAnswer ? '' : 'text-gray-400 italic'}>
                {userAnswer ?? 'No answer'}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * @param {object|null|undefined} run — raw from IndexedDB (sanitized for display)
 * @param {string} [mockTestIdFallback] — when run.mockTest.id missing
 * @param {string} [listMaxHeightClass]
 */
export default function MockTestArchiveSections({
  run,
  mockTestIdFallback,
  listMaxHeightClass = 'max-h-64',
}) {
  const safe = sanitizeRunForDisplay(run);
  if (!safe) return <p className="text-sm text-gray-500">No archive data.</p>;

  return (
    <div className="space-y-6 text-left text-sm">
      <div>
        <div className="font-semibold text-gray-900">User</div>
        <p className="text-gray-700">
          {(safe.user?.username || '—') + ' · ' + (safe.user?.email || '—')}
        </p>
        <p className="text-gray-500 text-xs">User ID: {safe.user?.id || '—'}</p>
      </div>
      <div>
        <div className="font-semibold text-gray-900">Mock test</div>
        <p className="text-gray-700">{safe.mockTest?.title || '—'}</p>
        <p className="text-gray-500 text-xs">ID: {safe.mockTest?.id || mockTestIdFallback || '—'}</p>
        <p className="text-gray-500 text-xs">Run ID: {safe.runId}</p>
        <p className="text-gray-500 text-xs">Status: {safe.status || '—'}</p>
      </div>
      {['listening', 'reading', 'writing'].map((key) => (
        <div key={key} className="border rounded-lg p-4 bg-gray-50/80">
          <h4 className="font-bold text-gray-900 capitalize mb-2">{key}</h4>
          <SectionBlock title={key} section={safe.sections?.[key]} listMaxHeightClass={listMaxHeightClass} />
          {safe.sections?.[key]?.submitMeta && (
            <pre className="mt-2 text-xs bg-white p-2 rounded border overflow-x-auto">
              {JSON.stringify(safe.sections[key].submitMeta, null, 2)}
            </pre>
          )}
        </div>
      ))}
    </div>
  );
}
