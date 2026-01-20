import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { HiOutlinePencil } from "react-icons/hi2";
import { LuUserRound } from "react-icons/lu";
import { LiaExternalLinkAltSolid } from "react-icons/lia";
import { Crown, Zap } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useSettingsStore } from "@/store/systemStore";
import { Link } from "react-router-dom";
import ProfileModal from "@/components/modal/ProfileModal";
import { format, differenceInCalendarDays } from "date-fns";

const ProfilePage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const authUser = useAuthStore((state) => state.authUser);
  const userProfile = useAuthStore((state) => state.userProfile);
  const settings = useSettingsStore((state) => state.settings);

  // Get user data from store
  const fullName = userProfile?.full_name || "";
  const email = authUser?.email || "";
  const phone_number = userProfile?.phone_number || "";
  const tg_username = userProfile?.telegram_username || "";

  // Premium status check
  const isPremium = userProfile?.subscription_status === "premium";
  const premiumStart = userProfile?.premium_started_at ? new Date(userProfile.premium_started_at) : null;
  const premiumUntil = userProfile?.premium_until
    ? new Date(userProfile.premium_until)
    : null;
  const daysRemaining = premiumUntil
    ? Math.max(0, differenceInCalendarDays(premiumUntil, premiumStart))
    : 0;

    const totalDays = premiumStart && premiumUntil ? differenceInCalendarDays(premiumUntil, premiumStart) : 0;
    const remainingDays = premiumUntil ? Math.max(0, differenceInCalendarDays(premiumUntil, new Date())) : 0;
    const progressPercent = totalDays > 0 ? (remainingDays / totalDays) * 100 : 0;

  // Split full_name into first and last name for display
  const nameParts = fullName ? fullName.split(" ") : [];
  const firstName = nameParts[0] || "";

  // Get initials for avatar
  const getInitials = () => {
    if (fullName) {
      if (nameParts.length >= 2) {
        return (
          nameParts[0][0] + nameParts[nameParts.length - 1][0]
        ).toUpperCase();
      }
      return fullName.substring(0, 2).toUpperCase();
    }
    if (email) {
      return email.substring(0, 2).toUpperCase();
    }
    return "U";
  };

  // Ma'lumotlar bo'lmagan holat uchun default qiymatlar
  const displayData = {
    firstName: firstName || "Not provided",
    tg_username: tg_username || "Not provided",
    email: email || "No email linked",
    phone_number: "No phone number", // Phone not in database schema
    supportTelegram: "@UmarovRahmatillo", // Static support info
    supportEmail: "test@mail.ru", // Static support info
  };

  return (
    <div className="mx-auto min-h-screen bg-[#F8FAFC] p-6 lg:p-12 font-sans">
      {/* Header Sarlavha */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-black text-gray-900">
            Account Settings
          </h1>
          
        </div>
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
            <div className="flex justify-between">
              <div className="flex items-center gap-5">
                <div className="relative">
                  <div
                    className={
                      isPremium
                        ? "p-1 bg-linear-to-br from-amber-400 via-orange-500 to-amber-400 rounded-full"
                        : ""
                    }
                  >
                    <Avatar
                      className={`size-24 shadow-sm ${
                        isPremium
                          ? "border-4 border-white"
                          : "border-2 border-gray-50"
                      }`}
                    >
                      <AvatarImage
                        src={userProfile?.avatar_image}
                        alt="User Avatar"
                      />
                      <AvatarFallback className="bg-gray-100 text-gray-400 text-3xl font-semibold">
                        {getInitials()}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="absolute bottom-0 -right-1 p-2 bg-blue-500 text-white rounded-full border-4 border-white shadow-sm hover:bg-blue-600 transition-all"
                  >
                    <HiOutlinePencil size={14} />
                  </button>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-gray-900 leading-tight">
                      {fullName || email || "User"}
                    </h3>
                    {isPremium && (
                      <div className="p-1 bg-linear-to-br from-amber-400 to-orange-500 rounded-md">
                        <Zap size={12} className="text-white" fill="white" />
                      </div>
                    )}
                  </div>
                  <p className="text-gray-400 font-medium">
                    {email || "No email"}
                  </p>
                </div>
              </div>
              {isPremium && premiumUntil && (
                <div className="relative overflow-hidden rounded-[24px] p-8 shadow-xl">
                  {/* Glassmorphism overlay */}
                  <div className="absolute inset-0 bg-linear-to-tr from-white/10 to-gray-100 pointer-events-none" />
                  <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

                  <div className="relative z-10">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-linear-to-br from-amber-400 to-orange-500 rounded-2xl shadow-lg shadow-amber-500/25">
                          <Crown size={28} className="text-white" />
                        </div>
                        <div>
                          <h2 className="text-xl font-black text-black">
                            Premium Subscription
                          </h2>
                          <p className="text-gray-400 font-medium">
                            Expires on {format(premiumUntil, "MMMM dd, yyyy")}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-black text-transparent bg-clip-text bg-linear-to-r from-amber-400 to-orange-400">
                          {daysRemaining} Days
                        </p>
                        <p className="text-gray-400 font-medium">Remaining</p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-6">
                      <div className="h-2 bg-gray-700/50 rounded-full overflow-hidden backdrop-blur-sm">
                        <div
                          className="h-full bg-linear-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-500"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-2 font-medium">
                        {Math.round(progressPercent)}% of subscription period
                        remaining
                      </p>
                    </div>
                  </div>
                </div>
              )}
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
                  placeholder="have not name"
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
                  placeholder="have not telegram username"
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
                  placeholder="have not email"
                  className="bg-gray-50/50 cursor-default border-gray-100 rounded-xl h-12 focus-visible:ring-blue-100"
                  readOnly
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-black text-gray-400 uppercase tracking-tighter">
                  Phone Number
                </Label>
                <Input
                  defaultValue={phone_number}
                  placeholder="have not phone number"
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
                  <p className="text-sm font-semibold text-gray-400 leading-none">
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
                  <p className="text-sm font-semibold text-gray-400">
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

      <ProfileModal open={isModalOpen} onOpenChange={setIsModalOpen} />
    </div>
  );
};

export default ProfilePage;
