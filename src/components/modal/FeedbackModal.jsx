import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquareText, X, Sparkles, UserCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useDashboardStore } from '@/store/dashboardStore';
import { useFeedbacksStore } from '@/store/feedbacks';
import { toast } from 'react-toastify';

const FEEDBACK_MODAL_SHOWN_KEY = "feedback_modal_shown"
const MAX_FEEDBACK_LENGTH = 1000

const markModalShown = () => {
    try {
        localStorage.setItem(FEEDBACK_MODAL_SHOWN_KEY, "true")
    } catch {
        // Private mode / storage disabled - not worth failing the interaction over.
    }
}

const FeedbackModal = ({ isOpen, setFeedbackOpen }) => {
    const [feedback, setFeedback] = useState("");
    const [loading, setLoading] = useState(false);
    const textareaRef = useRef(null);
    const autoShowHandled = useRef(false);
    const attempts = useDashboardStore((state) => state.attempts);
    const addFeedback = useFeedbacksStore((state) => state.addFeedback);
    const isEmpty = feedback.trim().length === 0;
    const MotionOverlay = motion.div
    const MotionContainer = motion.div
    const MotionHover = motion.div
    const MotionShine = motion.div

    const handleClose = useCallback(() => {
        markModalShown()
        setFeedbackOpen(false);
    }, [setFeedbackOpen])

    const handleDeferred = handleClose;

    const handleSubmit = async () => {
        const message = feedback.trim()
        if (loading || !message) {
            return
        }
        setLoading(true)
        try {
            const result = await addFeedback({ message })
            if (result?.success) {
                toast.success("Feedback sent successfully")
                setFeedback("")
                markModalShown()
                setFeedbackOpen(false)
            } else {
                toast.error(result?.error || "Could not send your feedback. Please try again.")
            }
        } finally {
            setLoading(false)
        }
    }

    const normalizeDate = useCallback((date) => {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }, []);

    const getDateKey = useCallback((dateInput) => {
        if (!dateInput) return null;
        const date = new Date(dateInput);
        if (isNaN(date.getTime())) return null;
        return normalizeDate(date);
    }, [normalizeDate]);

    const todayTestsCount = useMemo(() => {
        const today = normalizeDate(new Date());
        return attempts.filter((attempt) => {
            const attemptDate = attempt.completed_at || attempt.created_at;
            if (!attemptDate) return false;
            const dateKey = getDateKey(attemptDate);
            return dateKey === today;
        }).length;
    }, [attempts, getDateKey, normalizeDate]);

    const dailyTarget = 3; // Target tests per day

    // Auto-open once the user has done enough tests today. localStorage is read inside the
    // effect (not a useMemo) because it is not reactive state - reading it during render
    // makes the render impure and the result stale after the flag is written.
    useEffect(() => {
        if (autoShowHandled.current) return
        if (todayTestsCount < dailyTarget) return
        try {
            if (localStorage.getItem(FEEDBACK_MODAL_SHOWN_KEY) === "true") {
                autoShowHandled.current = true
                return
            }
        } catch {
            // Storage unavailable - fall through and show it this session only.
        }
        autoShowHandled.current = true
        markModalShown()
        setFeedbackOpen(true)
    }, [todayTestsCount, dailyTarget, setFeedbackOpen])

    // Close on Escape and lock background scroll while open.
    useEffect(() => {
        if (!isOpen) return
        const onKeyDown = (event) => {
            if (event.key === "Escape") handleClose()
        }
        const previousOverflow = document.body.style.overflow
        document.body.style.overflow = "hidden"
        document.addEventListener("keydown", onKeyDown)
        return () => {
            document.removeEventListener("keydown", onKeyDown)
            document.body.style.overflow = previousOverflow
        }
    }, [isOpen, handleClose])

    useEffect(() => {
        if (isOpen) textareaRef.current?.focus()
    }, [isOpen])

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <MotionOverlay 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleClose}
                        aria-hidden="true"
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
                    />

                    <MotionContainer
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="feedback-modal-title"
                        aria-describedby="feedback-modal-description"
                        initial={{ opacity: 0, scale: 0.98, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98, y: 10 }}
                        className="relative w-full max-w-md overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white p-8 shadow-[0_20px_50px_rgba(0,0,0,0.1)]"
                    >
                        <Button
                            onClick={handleClose}
                            variant="ghost"
                            size="icon"
                            aria-label="Close feedback dialog"
                            className="absolute right-4 top-4 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                        >
                            <X className="size-5" aria-hidden="true" />
                        </Button>

                        <div className="relative space-y-6">
                            <div className="space-y-3">
                                <div className="inline-flex items-center gap-2.5 rounded-full border border-primary/10 bg-primary/5 px-4 py-1.5 text-primary">
                                    <Sparkles className="size-3.5" aria-hidden="true" />
                                    <span className="text-[10px] font-bold uppercase tracking-widest">Feedback</span>
                                </div>
                                <h2 id="feedback-modal-title" className="text-2xl font-bold tracking-tight text-slate-900">
                                    Help us <span className="text-primary">improve</span>
                                </h2>
                                <p id="feedback-modal-description" className="text-sm text-slate-500 leading-relaxed">
                                    We read every piece of feedback. Share your thoughts or report an issue.
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div className="group relative">
                                    <label htmlFor="feedback-message" className="sr-only">
                                        Your feedback
                                    </label>
                                    <Textarea
                                        id="feedback-message"
                                        ref={textareaRef}
                                        value={feedback}
                                        onChange={(e) => setFeedback(e.target.value.slice(0, MAX_FEEDBACK_LENGTH))}
                                        maxLength={MAX_FEEDBACK_LENGTH}
                                        placeholder="Tell us what's on your mind..."
                                        className="min-h-[140px] w-full resize-none rounded-xl border-slate-200 bg-slate-50/50 p-4 pb-8 text-base text-slate-900 transition-all placeholder:text-slate-400 focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/5 group-hover:border-slate-300"
                                    />
                                    <div
                                        aria-live="polite"
                                        className="pointer-events-none absolute bottom-3 right-3 text-[10px] font-medium text-slate-400"
                                    >
                                        {feedback.length}/{MAX_FEEDBACK_LENGTH}
                                    </div>
                                </div>

                                <MotionHover
                                    whileHover={!isEmpty ? { y: -1 } : {}}
                                    whileTap={!isEmpty ? { scale: 0.99 } : {}}
                                >
                                    <Button 
                                        disabled={isEmpty || loading}
                                        onClick={handleSubmit}
                                        className="relative w-full h-12 overflow-hidden rounded-xl bg-slate-900 font-semibold text-white shadow-lg transition-all hover:bg-slate-800 disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none"
                                    >
                                        <span className="relative z-10 flex items-center gap-2">
                                            {loading ? "Sending..." : "Send Feedback"} <MessageSquareText className="size-4" />
                                        </span>
                                        {!isEmpty && (
                                            <MotionShine 
                                                initial={{ x: '-100%' }}
                                                whileHover={{ x: '100%' }}
                                                transition={{ duration: 0.7, ease: "easeInOut" }}
                                                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                                            />
                                        )}
                                    </Button>
                                </MotionHover>

                                <div className="flex items-start gap-2.5 rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                                    <UserCircle className="size-4 mt-0.5 text-slate-400" aria-hidden="true" />
                                    <p className="text-[12px] text-slate-500 leading-snug italic">
                                        Not ready yet? You can always find this form later in your{" "}
                                        <Link
                                            to="/profile"
                                            onClick={handleDeferred}
                                            className="font-semibold text-slate-700 underline underline-offset-2 hover:text-slate-900"
                                        >
                                            Profile Settings
                                        </Link>
                                        .
                                    </p>
                                </div>

                                <p className="text-center text-[10px] text-slate-400 uppercase tracking-tighter opacity-70">
                                    Sent securely • Visible only to our team
                                </p>
                            </div>
                        </div>
                    </MotionContainer>
                </div>
            )}
        </AnimatePresence>
    );
};

export default FeedbackModal;