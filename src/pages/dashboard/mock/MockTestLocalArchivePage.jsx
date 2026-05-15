import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { listAllRuns, clearAllArchiveRuns, sanitizeRunForDisplay } from '@/lib/mockTestIndexedArchive';
import MockTestArchiveSections from '@/components/mock/MockTestArchiveSections';
import { Button } from '@/components/ui/button';
import { toast } from 'react-toastify';

/**
 * Lists every mock test session archived in IndexedDB on this browser (newest first).
 */
export default function MockTestLocalArchivePage() {
  const navigate = useNavigate();
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [clearing, setClearing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listAllRuns();
      setRuns(data.map((r) => (r && typeof r === 'object' ? sanitizeRunForDisplay(r) : r)).filter(Boolean));
    } catch (e) {
      console.error('[MockTestLocalArchivePage]', e);
      setError(e?.message || 'Failed to load local archive');
      setRuns([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [load]);

  const handleClearArchive = async () => {
    if (runs.length === 0) return;
    const ok = window.confirm(
      'Delete all locally archived mock answers from this browser? This cannot be undone.'
    );
    if (!ok) return;
    setClearing(true);
    try {
      const result = await clearAllArchiveRuns();
      if (result.success) {
        toast.success('Local archive cleared.');
        setRuns([]);
      } else {
        toast.error(result.error || 'Could not clear archive.');
      }
    } catch (e) {
      console.error('[MockTestLocalArchivePage] clear failed:', e);
      toast.error(e?.message || 'Could not clear archive.');
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="w-full bg-gray-50 min-h-[calc(100vh-64px)]">
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Local answer archive</h1>
            <p className="text-gray-600 text-sm mt-1">
              Mock sessions saved in this browser (IndexedDB). Official correct answers are not stored here.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 justify-end">
            {runs.length > 0 && !loading && (
              <Button
                type="button"
                variant="destructive"
                disabled={clearing}
                onClick={handleClearArchive}
              >
                {clearing ? 'Clearing…' : 'Clear local archive'}
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => navigate('/mock-tests')}>
              Back to mock tests
            </Button>
          </div>
        </div>

        {loading && (
          <div className="text-center py-16 text-gray-600">Loading…</div>
        )}

        {!loading && error && (
          <p className="text-red-600 text-sm">{error}</p>
        )}

        {!loading && !error && runs.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-600">
            No archived sessions on this device yet.
          </div>
        )}

        {!loading && runs.length > 0 && (
          <div className="space-y-10">
            {runs.map((run) => {
              const date = run.updatedAt
                ? new Date(run.updatedAt).toLocaleString()
                : '—';
              return (
                <article key={run.runId} className="bg-white rounded-xl shadow border border-gray-100 p-6">
                  <div className="mb-4 pb-4 border-b border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-900">
                      {run.mockTest?.title || 'Mock test'}
                    </h2>
                    <p className="text-xs text-gray-500 mt-1">
                      Updated {date} · Run <span className="font-mono">{run.runId}</span>
                    </p>
                  </div>
                  <MockTestArchiveSections
                    run={run}
                    mockTestIdFallback={run.mockTest?.id}
                    listMaxHeightClass="max-h-[min(40vh,480px)]"
                  />
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
