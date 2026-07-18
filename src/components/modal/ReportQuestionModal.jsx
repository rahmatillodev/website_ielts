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
 * Savol bo'yicha shikoyat modali.
 *
 * Foydalanuvchi "qaysi savol" ekanini yozmaydi - `context` orqali savol avtomatik biriktiriladi
 * (savol raqami, matni, test, part). Shuning uchun modal sarlavhasida qaysi savol haqida
 * ekani ko'rsatiladi - foydalanuvchi nima yuborayotganini ko'rib turadi.
 */
const ReportQuestionModal = ({ open, onOpenChange, context }) => {
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const addQuestionReport = useFeedbacksStore((s) => s.addQuestionReport);

  const close = () => {
    setMessage('');
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    if (!message.trim()) {
      toast.error('Please describe the problem.');
      return;
    }
    setSubmitting(true);
    const result = await addQuestionReport({ ...context, message });
    setSubmitting(false);

    if (result.success) {
      toast.success('Thank you — your report was sent to our team.');
      close();
    } else {
      toast.error(result.error || 'Could not send your report.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(true) : close())}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Report a problem</DialogTitle>
          <DialogDescription className="text-gray-500 pt-1">
            {context?.questionNumber != null
              ? `Question ${context.questionNumber}`
              : 'This question'}
            {context?.testTitle ? ` · ${context.testTitle}` : ''}
            {context?.partNumber != null ? ` · Part ${context.partNumber}` : ''}
          </DialogDescription>
        </DialogHeader>

        {context?.questionText ? (
          <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 text-sm text-gray-600 max-h-24 overflow-y-auto">
            {String(context.questionText).replace(/<[^>]*>/g, '').slice(0, 300)}
          </div>
        ) : null}

        <div className="py-2">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, MAX_LEN))}
            rows={4}
            maxLength={MAX_LEN}
            disabled={submitting}
            placeholder="What looks wrong? e.g. the answer key seems incorrect, or there's a typo."
            className="w-full rounded-xl border border-gray-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
          <div className="text-right text-[11px] text-gray-400 mt-1">
            {message.length}/{MAX_LEN}
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" className="w-full sm:flex-1" onClick={close} disabled={submitting}>
            Cancel
          </Button>
          <Button
            className="w-full sm:flex-1"
            onClick={handleSubmit}
            disabled={submitting || !message.trim()}
          >
            {submitting ? 'Sending…' : 'Send report'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReportQuestionModal;
