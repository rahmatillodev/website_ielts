import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { HiOutlinePencil } from "react-icons/hi2";
import { LuUserRound } from "react-icons/lu";
import { LiaExternalLinkAltSolid } from "react-icons/lia";
import { useAuthStore } from "@/store/authStore";
import {useSettingsStore} from "@/store/systemStore";
import { Link } from "react-router-dom";

const ProfilePage = () => {
  const authUser = useAuthStore((state) => state.authUser);
  const userProfile = useAuthStore((state) => state.userProfile);
  const settings = useSettingsStore((state) => state.settings);

  // Get user data from store
  const fullName = userProfile?.full_name || '';
  const email = authUser?.email || '';
  const phone = userProfile?.phone || '';
  const tg_username = userProfile?.telegram_username || '';
  
  // Split full_name into first and last name for display
  const nameParts = fullName ? fullName.split(' ') : [];
  const firstName = nameParts[0] || '';

  // Get initials for avatar
  const getInitials = () => {
    if (fullName) {
      if (nameParts.length >= 2) {
        return (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase();
      }
      return fullName.substring(0, 2).toUpperCase();
    }
    if (email) {
      return email.substring(0, 2).toUpperCase();
    }
    return 'U';
  };

  // Ma'lumotlar bo'lmagan holat uchun default qiymatlar
  const displayData = {
    firstName: firstName || "Not provided",
    tg_username: tg_username || "Not provided",
    email: email || "No email linked",
    phone: "No phone number", // Phone not in database schema
    supportTelegram: "@UmarovRahmatillo", // Static support info
    supportEmail: "test@mail.ru", // Static support info
  };

  return (
    <div className=" mx-auto">
      {/* Header Sarlavha */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900">Account Settings</h1>
        <p className="text-gray-500 font-medium">
          Manage your personal information and preferences.
        </p>
      </div>

      <div className="space-y-6">
        {/* Personal Information Card */}
        <div className="bg-white border border-gray-100 rounded-[24px] p-8 shadow-sm">
          <h2 className="text-xl font-black text-gray-900 mb-6">
            Personal Information
          </h2>

          <div className="flex flex-col gap-8">
            {/* Avatar Section */}
            <div className="flex items-center gap-5">
              <div className="relative">
                <Avatar className="size-24 border-2 border-gray-50 shadow-sm">
                  <AvatarImage src={null} alt="User Avatar" />
                  <AvatarFallback className="bg-gray-100 text-gray-400 text-3xl font-bold">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                {/* <button className="absolute bottom-0 -right-1 p-2 bg-blue-500 text-white rounded-full border-4 border-white shadow-sm hover:bg-blue-600 transition-all">
                  <HiOutlinePencil size={14} />
                </button> */}
              </div>
              <div>
                <h3 className="text-lg font-black text-gray-900 leading-tight">
                  {fullName || email || 'User'}
                </h3>
                <p className="text-gray-400 font-medium">{email || 'No email'}</p>
              </div>
            </div>

            <hr className="border-gray-50" />

            {/* Form Inputs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              <div className="space-y-2">
                <Label className="text-sm font-black text-gray-400 uppercase tracking-tighter">
                  First Name
                </Label>
                <Input
                  defaultValue={firstName}
                  placeholder="Enter first name"
                  className="bg-gray-50/50 border-gray-100 cursor-default rounded-xl h-12 focus-visible:ring-blue-100"
                  readOnly
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-black text-gray-400 uppercase tracking-tighter">
                  telegram username
                </Label>
                <Input
                  defaultValue={tg_username}
                  placeholder="Enter telegram username"
                  className="bg-gray-50/50 cursor-default border-gray-100 rounded-xl h-12 focus-visible:ring-blue-100"
                  readOnly
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-black text-gray-400 uppercase tracking-tighter">
                  Email Address
                </Label>
                <Input
                  defaultValue={email}
                  type="email"
                  placeholder="Enter email"
                  className="bg-gray-50/50 cursor-default border-gray-100 rounded-xl h-12 focus-visible:ring-blue-100"
                  readOnly
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-black text-gray-400 uppercase tracking-tighter">
                  Phone Number
                </Label>
                <Input
                  defaultValue={phone}
                  placeholder="Enter phone number"
                  className="bg-gray-50/50 cursor-default border-gray-100 rounded-xl h-12 focus-visible:ring-blue-100"
                  readOnly
                />
              </div>
            </div>
          </div>
        </div>

        {/* Contact Support Card */}
        <div className="bg-white border border-gray-100 rounded-[24px] p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2.5 bg-blue-50 text-blue-500 rounded-xl">
              <LuUserRound size={22} />
            </div>
            <h2 className="text-xl font-black text-gray-900">
              Contact support
            </h2>
          </div>

          <div className="space-y-6">
            <div className="space-y-1">
              <p className="text-sm font-black text-gray-900">Telegram</p>
              <div className="flex items-center gap-1">
                <Link to={settings?.telegram_admin_username} target="_blank">
                  <p className="text-sm font-bold text-gray-400 leading-none">
                    {displayData.supportTelegram}
                  </p>
                </Link>
                <LiaExternalLinkAltSolid
                  size={18}
                  className="text-gray-400 mb-0.5"
                />
              </div>
            </div>

            <hr className="border-gray-50" />

            <div className="space-y-1">
              <p className="text-sm font-black text-gray-900">Email</p>
              <div className="flex items-center gap-1">
                <Link to={settings?.support_link} target="_blank">
                  <p className="text-sm font-bold text-gray-400">
                    {displayData.supportEmail}{" "}
                  </p>
                </Link>
                <LiaExternalLinkAltSolid
                  size={18}
                  className="text-gray-400 mb-0.5"
                />
            </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
