import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'react-toastify';
import { useFeedbacksStore } from '@/store/feedbacks';

const MAX_LEN = 1000;

/**
 * Natija sahifalaridan umumiy fikr yuborish modali.
 *
 * `ReportQuestionModal` bitta savol ustidan shikoyat uchun; bu esa test yoki natija
 * haqidagi UMUMIY fikr uchun, shuning uchun `type: 'general'` bilan saqlanadi.
 * Foydalanuvchi qaysi test ekanini yozmaydi - `context` orqali avtomatik biriktiriladi.
 */
const ResultFeedbackModal = ({ open, onOpenChange, context, title, description }) => {
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const addFeedback = useFeedbacksStore((s) => s.addFeedback);

  const close = () => {
    setMessage('');
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    if (!message.trim()) {
      toast.error('Please tell us what went wrong.');
      return;
    }
    setSubmitting(true);
    const result = await addFeedback({ ...context, message });
    setSubmitting(false);

    if (result.success) {
      toast.success('Thank you — your feedback was sent to our team.');
      close();
    } else {
      toast.error(result.error || 'Could not send your feedback.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(true) : close())}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {title || 'Send feedback'}
          </DialogTitle>
          <DialogDescription className="text-gray-500 pt-1">
            {description || 'About this test and its result.'}
            {context?.testTitle ? ` · ${context.testTitle}` : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <label htmlFor="result-feedback-message" className="sr-only">
            Your feedback
          </label>
          <textarea
            id="result-feedback-message"
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, MAX_LEN))}
            rows={4}
            maxLength={MAX_LEN}
            disabled={submitting}
            placeholder="e.g. the band score looks wrong, the audio cut out, or a passage didn't load."
            className="w-full rounded-xl border border-gray-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
          <div className="text-right text-[11px] text-gray-400 mt-1" aria-live="polite">
            {message.length}/{MAX_LEN}
          </div>
        </div>

        <p className="text-[11px] text-gray-400">
          Sent privately to our team along with this test and attempt.
        </p>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" className="w-full sm:flex-1" onClick={close} disabled={submitting}>
            Cancel
          </Button>
          <Button
            className="w-full sm:flex-1"
            onClick={handleSubmit}
            disabled={submitting || !message.trim()}
          >
            {submitting ? 'Sending…' : 'Send feedback'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ResultFeedbackModal;
