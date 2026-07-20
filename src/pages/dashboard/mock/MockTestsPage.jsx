import { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { useMockTestClientStore, setVerifiedMockPassword } from "@/store/mockTestClientStore";
import { useMockTests } from "@/hooks/useMockTests";
import {  MdHistory } from "react-icons/md";
import MockTestPasswordModal from "@/components/modal/MockTestPasswordModal";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";
import { listAllRuns } from "@/lib/mockTestIndexedArchive";
import { format } from "date-fns";
import { MdEventAvailable, MdSchedule } from "react-icons/md";

/**
 * `date` is a plain YYYY-MM-DD column and `time` a Postgres `time` (HH:mm:ss).
 * Parse the date parts explicitly - `new Date("2026-07-22")` is read as UTC
 * midnight and renders as the previous day west of Greenwich. Times lose the
 * always-zero seconds.
 */
const formatBookingDate = (value) => {
  if (!value) return null;
  const [y, m, d] = String(value).slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return null;
  return format(new Date(y, m - 1, d), "EEEE, d MMMM yyyy");
};

const formatBookingTime = (value) => {
  if (!value) return null;
  const match = String(value).trim().match(/^(\d{1,2}):(\d{2})/);
  return match ? `${match[1].padStart(2, "0")}:${match[2]}` : String(value).trim();
};

const BOOKING_STATUS_LABEL = {
  booked: { text: "Booked", className: "bg-blue-50 text-blue-700 border-blue-200" },
  started: { text: "In progress", className: "bg-amber-50 text-amber-700 border-amber-200" },
  completed: { text: "Awaiting review", className: "bg-purple-50 text-purple-700 border-purple-200" },
  checked: { text: "Result ready", className: "bg-green-50 text-green-700 border-green-200" },
  notified: { text: "Result sent", className: "bg-gray-100 text-gray-700 border-gray-200" },
};

const MockTestsPage = () => {
  const {
    fetchClientById,
    fetchClientAttempts,
    loading,
    isMockTestClient,
    client,
  } = useMockTestClientStore();
  const { userProfile } = useAuthStore();
  
  const {
    mockTests,

    loading: mockTestsLoading,
    verifyPassword,
  } = useMockTests();

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordCode, setPasswordCode] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasLocalArchive, setHasLocalArchive] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const runs = await listAllRuns();
        if (!cancelled) setHasLocalArchive(runs.length > 0);
      } catch {
        if (!cancelled) setHasLocalArchive(false);
      }
    };
    check();
    const onFocus = () => check();
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  const handlePasswordChange = (value) => {
    setPasswordCode(value);
    setPasswordError(''); // Clear error when user types
  };

  const handlePasswordSubmit = async () => {
    if (!passwordCode || passwordCode.trim() === '') {
      setPasswordError('Please enter a password code');
      return;
    }

    setIsSubmitting(true);
    setPasswordError('');

    try {
      const trimmedPassword = passwordCode.trim();
      const result = await verifyPassword(trimmedPassword);

      if (result.success && result.mockTest) {
        // Tasdiqlangan parolni shu sessiya uchun saqlaymiz: flow sahifasi (reload'dan keyin ham)
        // uni RPC'ga uzatib, kontentni server tomonda qayta tekshiradi.
        setVerifiedMockPassword(result.mockTest.id, trimmedPassword);

        // Close modal and navigate to the mock test flow
        setIsPasswordModalOpen(false);
        setPasswordCode('');
        setPasswordError('');
        navigate(`/mock-test/flow/${result.mockTest.id}`);
      } else {
        setPasswordError(result.error || 'Invalid password code. Please try again.');
      }
    } catch (err) {
      console.error('Password verification error:', err);
      setPasswordError('Failed to verify password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordModalClose = () => {
    setIsPasswordModalOpen(false);
    setPasswordCode('');
    setPasswordError('');
  };

  const [results, setResults] = useState({
    listening: null,
    reading: null,
    writing: null
  });

  // Load results for existing client (backward compatibility)
  useEffect(() => {
    const loadResults = async () => {
      if (userProfile?.id) {
        try {
          const data = await fetchClientAttempts(userProfile.id);
          if (data?.results) {
            setResults(data.results);
          }
        } catch (err) {
          console.error('Failed to load results:', err);
        }
      }
    };

    loadResults();
  }, [userProfile?.id, fetchClientAttempts]);

  // Load client for backward compatibility
  useEffect(() => {
    if (userProfile?.id) {
      fetchClientById(userProfile.id);
    }
  }, [userProfile?.id, fetchClientById]);

  // Display error message from navigation state (e.g., when redirected from MockTestFlow)
  useEffect(() => {
    if (location.state?.error) {
      toast.error(location.state.error);
      // Clear the state to prevent showing the error again on re-render
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname]);



  // const handleStartTest = () => {
  //   setShowStartModal(false);
  //   // Navigate to mock test flow; pass state so flow skips device check and shows intro video
  //   if (mockTest?.id) {
  //     navigate(`/mock-test/flow/${mockTest.id}`, { state: { audioCheckDone: true } });
  //   } else {
  //     console.error('Mock test not found');
  //     alert('Mock test configuration not found. Please contact support.');
  //   }
  // };
 




  // Note: Backward compatibility logic removed
  // The "Wait for Result" message is now shown in the card itself
  // Users can see all mock tests and their status in the list/grid view

  const bookingDate = formatBookingDate(client?.date);
  const bookingTime = formatBookingTime(client?.time);
  const bookingStatus = client?.status ? BOOKING_STATUS_LABEL[client.status] : null;

  if ((loading || mockTestsLoading) && mockTests.length === 0) {
    return (
      <div className="text-center py-10 w-full h-full max-w-7xl mx-auto">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading mock tests...</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-gray-50" style={{height: 'calc(100vh - 64px)'}}>
      <div className="max-w-7xl mx-auto py-6 h-full">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            Mock Tests
          </h1>
          <p className="text-gray-600">
            Practice with full-length mock tests. Each test can only be taken once.
          </p>
        </div>
        
        <div className="flex items-center gap-3 flex-wrap justify-end">
          {hasLocalArchive && (
            <Button
              type="button"
              variant="secondary"
              className="text-sm font-semibold"
              onClick={() => navigate("/mock-tests/local-archive")}
            >
              Local answer archive
            </Button>
          )}
          {isMockTestClient === true && (
            <Link
              to="/mock-test/history"
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-semibold"
            >
              <MdHistory className="text-lg" />
              History
            </Link>
          )}
        </div>
      </div>

      {/* Mock Tests List/Grid */}
      {mockTests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-gray-500 text-lg mb-4">No mock tests available</p>
          <p className="text-gray-400 text-sm">Check back later for new mock tests.</p>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center mt-12 px-4">
          {/* The booking used to be invisible here: a student with a scheduled
              test saw exactly the same bare password button as anyone else, with
              no confirmation of when their test actually was. */}
          {bookingDate || bookingTime || bookingStatus ? (
            <div className="w-full max-w-md mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Your mock test
                  </p>
                  {client?.full_name && (
                    <p className="mt-1 font-semibold text-gray-900">{client.full_name}</p>
                  )}
                </div>
                {bookingStatus && (
                  <span
                    className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${bookingStatus.className}`}
                  >
                    {bookingStatus.text}
                  </span>
                )}
              </div>

              {bookingDate ? (
                <div className="space-y-2 text-sm text-gray-700">
                  <div className="flex items-center gap-2">
                    <MdEventAvailable className="text-lg text-gray-400 shrink-0" />
                    <span className="font-medium">{bookingDate}</span>
                  </div>
                  {bookingTime && (
                    <div className="flex items-center gap-2">
                      <MdSchedule className="text-lg text-gray-400 shrink-0" />
                      <span className="font-medium">{bookingTime}</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  No date has been scheduled yet. Your centre will confirm it with you.
                </p>
              )}

              <p className="mt-4 border-t border-gray-100 pt-4 text-xs leading-relaxed text-gray-500">
                Your invigilator gives you the password on the day. Enter it below to begin.
              </p>
            </div>
          ) : null}

          <Button
            onClick={() => setIsPasswordModalOpen(true)}
            className="w-full max-w-md px-4 py-6 text-lg"
          >
            Enter Password to Start Test
          </Button>
        </div>
      )}

      <MockTestPasswordModal
        isOpen={isPasswordModalOpen}
        passwordCode={passwordCode}
        passwordError={passwordError}
        isSubmitting={isSubmitting}
        onPasswordChange={handlePasswordChange}
        onSubmit={handlePasswordSubmit}
        onCancel={handlePasswordModalClose}
      />
    </div>
    </div>

  );
};

export default MockTestsPage;
