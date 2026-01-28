import React, { useState, useEffect, useRef } from 'react';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { HiOutlineCamera } from 'react-icons/hi2';
import { toast } from 'react-toastify';
import { useAuthStore } from '@/store/authStore';

const ProfileModal = ({ open, onOpenChange }) => {
  const userProfile = useAuthStore((state) => state.userProfile);
  const authUser = useAuthStore((state) => state.authUser);
  const updateUserProfile = useAuthStore((state) => state.updateUserProfile);
  const uploadAvatar = useAuthStore((state) => state.uploadAvatar);
  const [loading, setLoading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    full_name: userProfile?.full_name || '',
    telegram_username: userProfile?.telegram_username || '',
    phone_number: userProfile?.phone_number || '',
    avatar_image: userProfile?.avatar_image || null,
    target_band_score: userProfile?.target_band_score || 7.5,
  });

  useEffect(() => {
    if (userProfile) {
      setFormData({
        full_name: userProfile.full_name || '',
        telegram_username: userProfile.telegram_username || '',
        phone_number: userProfile.phone_number || '',
        target_band_score: userProfile.target_band_score || 7.5,
      });
      setAvatarPreview(userProfile.avatar_image || null);
    }
    setAvatarFile(null);
  }, [userProfile, open]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'phone_number') {
      setFormData((prev) => ({ ...prev, [name]: formatUzPhone(value) }));
    } else if (name === 'target_band_score') {
      const numValue = parseFloat(value);
      if (!isNaN(numValue) && numValue >= 0 && numValue <= 9) {
        setFormData((prev) => ({ ...prev, [name]: numValue }));
      } else if (value === '') {
        setFormData((prev) => ({ ...prev, [name]: '' }));
      }
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };
  // Telefon raqamini formatlash funksiyasi
  const formatUzPhone = (value) => {
    // Faqat raqamlarni qoldiramiz
    const numbers = value.replace(/\D/g, '');

    // Agar +998 bilan boshlanmasa, uni qo'shamiz
    let result = '';
    if (numbers.startsWith('998')) {
      result = '+' + numbers;
    } else {
      result = '+998' + numbers;
    }

    // Maksimal uzunlikni cheklash (+998 va 9 ta raqam = 13 ta belgi)
    return result.substring(0, 13);
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validImageTypes.includes(file.type)) {
      toast.error('Invalid file format. Please select a JPEG, PNG, GIF, or WebP image.');
      e.target.value = ''; // Reset file input
      return;
    }

    // Validate file size (5MB limit)
    const maxSizeInBytes = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSizeInBytes) {
      toast.error('File size too large. Please select an image smaller than 5MB.');
      e.target.value = ''; // Reset file input
      return;
    }

    // If validation passes, set the file and create preview
    try {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onerror = () => {
        toast.error('Error reading file. Please try selecting the image again.');
        setAvatarFile(null);
        setAvatarPreview(userProfile?.avatar_image || null);
        e.target.value = ''; // Reset file input
      };
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error('An unexpected error occurred while processing the image.');
      setAvatarFile(null);
      setAvatarPreview(userProfile?.avatar_image || null);
      e.target.value = ''; // Reset file input
    }
  };

  const getInitials = () => {
    const fullName = formData.full_name;
    if (fullName) {
      const parts = fullName.split(' ');
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return fullName.substring(0, 2).toUpperCase();
    }
    return authUser?.email?.substring(0, 2).toUpperCase() || 'U';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Validate phone number format only if provided
    const phoneNumber = formData.phone_number.trim();
    if (phoneNumber && phoneNumber.length !== 13) {
      toast.error("Iltimos, telefon raqamini to'liq kiriting (+998XXXXXXXXX)");
      setLoading(false);
      return;
    }

    try {
      let avatarUrl = userProfile?.avatar_image;

      // Upload avatar if new file selected
      if (avatarFile) {
        const uploadResult = await uploadAvatar(avatarFile);
        if (!uploadResult.success) {
          const errorMessage = uploadResult.error || 'Failed to upload image. Please try again later.';
          toast.error(errorMessage);
          setLoading(false);
          return;
        }
        avatarUrl = uploadResult.url;
      }

      // Validate target band score
      const targetScore = formData.target_band_score;
      if (targetScore !== '' && (isNaN(targetScore) || targetScore < 0 || targetScore > 9)) {
        toast.error('Target band score must be between 0 and 9');
        setLoading(false);
        return;
      }

      // Prepare profile data - only include phone_number if it's provided and properly formatted
      const profileData = {
        full_name: formData.full_name.trim() || null,
        telegram_username: formData.telegram_username.trim() || null,
        phone_number: phoneNumber || null,
        avatar_image: avatarUrl,
        target_band_score: targetScore !== '' ? parseFloat(targetScore) : 7.5,
      };

      // Update user profile
      const result = await updateUserProfile(profileData);

      if (!result.success) {
        const errorMessage = result.error || 'Failed to update profile. Please try again.';
        toast.error(errorMessage);
        setLoading(false);
        return;
      }

      // Success
      toast.success('Profile updated successfully!');
      onOpenChange(false);
    } catch (error) {
      const errorMessage = error?.message || 'An unexpected error occurred. Please try again.';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-black">Edit Profile</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Avatar Upload */}
          <div className="flex justify-center">
            <div className="relative">
              <Avatar
                className="size-24 border-2 border-gray-100 cursor-pointer"
                onClick={handleAvatarClick}
              >
                <AvatarImage src={avatarPreview} alt="Avatar" />
                <AvatarFallback className="bg-gray-100 text-gray-400 text-2xl font-semibold">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <button
                type="button"
                onClick={handleAvatarClick}
                className="absolute bottom-0 right-0 p-2 bg-blue-500 text-white rounded-full border-3 border-white shadow-sm hover:bg-blue-600 transition-all"
              >
                <HiOutlineCamera size={14} />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold text-gray-500">Full Name</Label>
            <Input
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              placeholder="Enter your full name"
              className="rounded-xl h-11"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold text-gray-500">Telegram Username</Label>
            <Input
              name="telegram_username"
              value={formData.telegram_username}
              onChange={handleChange}
              placeholder="@username"
              className="rounded-xl h-11"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold text-gray-500">Phone Number</Label>
            <Input
              name="phone_number"
              value={formData.phone_number}
              onChange={handleChange}
              maxLength={13}
              placeholder="+998 90 123 45 67"
              className="rounded-xl h-11"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold text-gray-500">Target Band Score</Label>
            <Input
              type="number"
              name="target_band_score"
              value={formData.target_band_score}
              onChange={handleChange}
              min="0"
              max="9"
              step="0.5"
              placeholder="7.5"
              className="rounded-xl h-11"
            />
            <p className="text-xs text-gray-400">
              Set your target IELTS band score (0-9)
            </p>
          </div>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-blue-500 hover:bg-blue-600"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileModal;
