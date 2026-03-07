import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { toast } from 'react-toastify';
import { useAuthStore } from '@/store/authStore';

const MIN_PASSWORD_LENGTH = 6;

const ChangePasswordModal = ({ open, onOpenChange }) => {
  const changePassword = useAuthStore((state) => state.changePassword);
  const [loading, setLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
  };

  const handleOpenChange = (nextOpen) => {
    if (!nextOpen) resetForm();
    onOpenChange(nextOpen);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const { currentPassword, newPassword, confirmPassword } = formData;

    if (!currentPassword.trim()) {
      toast.error('Please enter your current password.');
      return;
    }
    if (!newPassword.trim()) {
      toast.error('Please enter a new password.');
      return;
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      toast.error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New password and confirm password do not match.');
      return;
    }
    if (currentPassword === newPassword) {
      toast.error('New password must be different from your current password.');
      return;
    }

    setLoading(true);
    try {
      const result = await changePassword(currentPassword, newPassword);

      if (result.success) {
        toast.success('Password updated successfully.');
        handleOpenChange(false);
      } else {
        const msg = result.error || 'Failed to update password. Please try again.';
        toast.error(msg);
      }
    } catch (error) {
      toast.error(error?.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const PasswordField = ({ name, label, value, show, onToggleShow, placeholder = '••••••••' }) => (
    <div className="space-y-2">
      <Label className="text-sm font-semibold text-gray-500">{label}</Label>
      <div className="relative">
        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
        <Input
          type={show ? 'text' : 'password'}
          name={name}
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={loading}
          className="pl-10 pr-10 rounded-xl h-11 border-gray-200"
          autoComplete={name === 'currentPassword' ? 'current-password' : 'new-password'}
        />
        <button
          type="button"
          onClick={onToggleShow}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-black">Change Password</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <PasswordField
            name="currentPassword"
            label="Current Password"
            value={formData.currentPassword}
            show={showCurrent}
            onToggleShow={() => setShowCurrent((s) => !s)}
          />
          <PasswordField
            name="newPassword"
            label="New Password"
            value={formData.newPassword}
            show={showNew}
            onToggleShow={() => setShowNew((s) => !s)}
          />
          <PasswordField
            name="confirmPassword"
            label="Confirm Password"
            value={formData.confirmPassword}
            show={showConfirm}
            onToggleShow={() => setShowConfirm((s) => !s)}
          />
          <p className="text-xs text-gray-400">
            Password must be at least {MIN_PASSWORD_LENGTH} characters.
          </p>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-blue-500 hover:bg-blue-600"
            >
              {loading ? 'Updating...' : 'Update Password'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ChangePasswordModal;
