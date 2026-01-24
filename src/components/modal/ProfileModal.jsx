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
  });

  useEffect(() => {
    if (userProfile) {
      setFormData({
        full_name: userProfile.full_name || '',
        telegram_username: userProfile.telegram_username || '',
        phone_number: userProfile.phone_number || '',
      });
      setAvatarPreview(userProfile.avatar_image || null);
    }
    setAvatarFile(null);
  }, [userProfile, open]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();

  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
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
    
    let avatarUrl = userProfile?.avatar_image;
    
    // Upload avatar if new file selected
    if (avatarFile) {
      const uploadResult = await uploadAvatar(avatarFile);
      if (uploadResult.success) {
        avatarUrl = uploadResult.url;
      } else {
        toast.error('Error uploading image. Please try again later.');
        setLoading(false);
        return;
      }
    }
    
    const result = await updateUserProfile({
      ...formData,
      avatar_image: avatarUrl,
    });
    
    setLoading(false);
    if (result.success) {
      onOpenChange(false);
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
              placeholder="+998 90 123 45 67"
              className="rounded-xl h-11"
            />
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
