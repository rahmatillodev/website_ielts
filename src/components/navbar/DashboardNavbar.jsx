import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  LuUser,
  LuLogOut,
  LuCreditCard,
  LuMenu
} from "react-icons/lu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import LogoutModal from '../modal/LogoutModal';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';
import LogoDesign from '../LogoDesign';


const DashboardNavbar = ({ onMenuClick, flow = 'regular' }) => {
  const navigate = useNavigate();
  const authUser = useAuthStore((state) => state.authUser);
  const userProfile = useAuthStore((state) => state.userProfile);
  const signOut = useAuthStore((state) => state.signOut);

  const displayName =
    userProfile?.full_name ||
    authUser?.email?.split('@')[0] ||
    'User';

  const email = authUser?.email || 'user@example.com';
  const subscriptionStatus = userProfile?.subscription_status || 'Free';

  const handleLogout = async () => {
    const result = await signOut();
    if (result?.success) {
      toast.success('Logged out successfully');
      navigate('/login');
    } else {
      toast.error(result?.error || 'Failed to log out');
    }
  };

  const getInitials = () => {
    if (userProfile?.full_name) {
      const names = userProfile.full_name.split(' ');
      return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    }
    return email.substring(0, 2).toUpperCase();
  };

  return (
    <nav className="w-full h-16 bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="h-full px-4 md:px-8 flex items-center justify-between">

        {/* ===== LEFT ===== */}
        {flow === 'mockTest' && (
            <div className="flex items-center gap-3">
                {/* <div className="size-10 2xl:size-12 bg-[#EBF5FF] rounded-xl flex items-center justify-center">
                  <GraduationCap className="text-[#4A90E2] size-6 2xl:size-7" />
                </div>
                <span className="text-lg 2xl:text-xl font-black text-[#1E293B] tracking-tight">
                  IELTSCORE
                </span> */}
                <LogoDesign />
                <span className="text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-bold">
                  Mock Test
                </span>
              </div>
        )}
        <div className="flex items-center gap-3">
          {onMenuClick && (
            <button
              type="button"
              onClick={onMenuClick}
              className="md:hidden inline-flex items-center justify-center size-10 rounded-xl border border-gray-100 text-gray-600 hover:bg-gray-50"
              aria-label="Open sidebar"
            >
              <LuMenu className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* ===== RIGHT: USER MENU ===== */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex items-center gap-3 cursor-pointer">
              <div className="hidden md:flex flex-col items-end">
                <span className="text-[15px] font-semibold text-gray-900">
                  {displayName}
                </span>
                <span className="text-[11px] text-gray-500 font-semibold">
                  {subscriptionStatus}
                </span>
              </div>

              <Avatar className="size-10 shadow-sm">
                <AvatarImage src={userProfile?.avatar_image || ""} className="object-cover" />
                <AvatarFallback className="bg-[#00838f] text-white font-medium">
                  {getInitials()[0]}
                </AvatarFallback>
              </Avatar>
            </div>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="end"
            className="w-[280px] mt-2 rounded-[24px] p-0 shadow-2xl"
          >
            <div className="p-4 text-center">
              {userProfile?.avatar_image ? (
                <img
                  src={`${userProfile.avatar_image}?t=${Date.now()}`}
                  alt="avatar"
                  className="size-16 mx-auto rounded-full object-cover"
                />
              ) : (
                <div className="size-16 mx-auto bg-[#00838f] rounded-full flex items-center justify-center text-white text-2xl font-semibold">
                  {getInitials()[0]}
                </div>
              )}

              <h2 className="mt-2 font-bold">{displayName}</h2>
              <p className="text-xs text-gray-500">{email}</p>
            </div>

            <div className="px-2 pb-2">
              {flow !== 'mockTest' && (
                <DropdownMenuItem asChild className="hover:bg-gray-50">
                <Link
                  to="/profile"
                  className="flex items-center gap-3 px-3 py-2 rounded-xl"
                >
                  <LuUser className="w-5 h-5" />
                  Profile Settings
                </Link>
              </DropdownMenuItem>
              )}

              <LogoutModal onConfirm={handleLogout}>
                <DropdownMenuItem
                  onSelect={(e) => e.preventDefault()}
                  className="text-red-600 font-semibold p-2 px-3 hover:text-red-600 rounded-xl"
                >
                  <LuLogOut className="w-5 h-5 mr-1 text-red-600 hover:text-red-600 rounded-xl" />
                  <span className="text-red-600 hover:text-red-600 rounded-xl">Log out</span>
                </DropdownMenuItem>
              </LogoutModal>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
};

export default DashboardNavbar;
