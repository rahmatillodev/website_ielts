/**
 * Shared IndexedDB mock archive viewer: question snapshot + user answers only (sanitized; no correct keys).
 */
import { sanitizeRunForDisplay } from '@/lib/mockTestIndexedArchive';

export function lookupUserAnswer(answers, row) {
  if (!answers || typeof answers !== 'object') return '';
  const rawKeys = [
    row.questionId,
    row.groupQuestionId,
    row.questionNumber,
    row.questionNumber != null ? String(row.questionNumber) : null,
  ].filter((k) => k != null && k !== '');
  const keys = [...new Set(rawKeys.map((k) => (typeof k === 'number' ? k : String(k))))];
  for (const k of keys) {
    const v = answers[k];
    if (v != null && String(v).trim() !== '') return String(v).trim();
  }
  if (row.taskName && answers[row.taskName] != null) {
    return String(answers[row.taskName]).trim();
  }
  if (row.userAnswerPreview) return String(row.userAnswerPreview).trim();
  return '';
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
        const ans = lookupUserAnswer(answersObj, row);
        const num =
          row.questionNumber != null
            ? `Q${row.questionNumber}`
            : row.taskName || `Row ${idx + 1}`;
        return (
          <div key={`${num}-${idx}`} className="border-b border-gray-100 pb-2 text-left text-sm">
            <div className="font-semibold text-gray-800">{num}</div>
            {row.questionText && (
              <div className="text-gray-600 mt-0.5 whitespace-pre-wrap wrap-break-word">{row.questionText}</div>
            )}
            <div className="mt-1 text-blue-900">
              <span className="font-medium">Your answer: </span>
              <span className={ans ? '' : 'text-gray-400 italic'}>{ans || '(empty)'}</span>
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
