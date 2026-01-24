import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LuUser, 
  LuSettings, 
  LuLogOut, 
  LuMenu,
  LuCreditCard
} from "react-icons/lu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Link } from 'react-router-dom';
import LogoutModal from '../modal/LogoutModal';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';

const DashboardNavbar = ({ onMenuClick }) => {
  const navigate = useNavigate();
  const authUser = useAuthStore((state) => state.authUser);
  const userProfile = useAuthStore((state) => state.userProfile);
  const signOut = useAuthStore((state) => state.signOut);

  const displayName = userProfile?.full_name || authUser?.email?.split('@')[0] || 'User';
  const email = authUser?.email || 'user@example.com';
  const subscriptionStatus = userProfile?.subscription_status || 'Free';

  const handleLogout = async () => {
    const result = await signOut();
    if (result?.success) {
      toast.success('Logged out successfully');
      navigate('/');
    } else {
      toast.error(result?.error || 'Failed to log out');
    }
  };

  const getInitials = () => {
    if (userProfile?.full_name) {
      const names = userProfile.full_name.split(' ');
      return names.length >= 2 
        ? (names[0][0] + names[names.length - 1][0]).toUpperCase()
        : userProfile.full_name.substring(0, 2).toUpperCase();
    }
    return email.substring(0, 2).toUpperCase();
  };

  return (
    <nav className="w-full h-16 bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="h-full px-4 md:px-8 flex items-center justify-between md:justify-end">
        <button onClick={onMenuClick} className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <LuMenu className="w-6 h-6 text-gray-700" />
        </button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex items-center gap-3 cursor-pointer">
            <div className="hidden md:flex flex-col items-end">
                <span className="text-[15px] font-semibold text-gray-900 leading-tight">
                  {displayName}
                </span>
                {/* <span className="text-xs text-gray-500">
                  {email}
                </span> */}
                {subscriptionStatus && (
                  <span
                    className={`text-[11px] text-gray-500 font-semibold`}>
                    {subscriptionStatus.charAt(0).toUpperCase() +
                      subscriptionStatus.slice(1)}
                  </span>
                )}
              </div>
              <Avatar className="size-10 border-2 border-transparent hover:border-blue-100 transition-all shadow-sm">
                <AvatarFallback className="bg-[#00838f] text-white text-lg font-medium">
                  {getInitials()[0]}
                </AvatarFallback>
              </Avatar>
             
            </div>
          </DropdownMenuTrigger>

          <DropdownMenuContent 
            className="w-[280px] mt-2 rounded-[24px] overflow-hidden p-0 shadow-2xl border border-gray-100 bg-white" 
            align="end"
          >
            {/* Top Profile Section - White Theme */}
            <div className="p-2 flex flex-col items-center bg-gray-50/50 m-2 rounded-[20px] border border-gray-50">
              <div className="size-16 bg-[#00838f] rounded-full flex items-center justify-center text-white text-2xl font-medium mb-3 shadow-inner">
                {getInitials()[0]}
              </div>
              <h2 className="text-gray-900 text-lg font-bold mb-0.5">{displayName}</h2>
              <p className="text-xs text-gray-500 font-medium">{email}</p>
            </div>

            {/* Menu Items - Only 3 items as requested */}
            <div className="px-2 py-2">
              <DropdownMenuItem className="rounded-xl focus:bg-gray-50 cursor-pointer outline-none">
                <Link to="/profile" className="flex items-center gap-4 px-3 py-1 w-full">
                  <LuUser className="w-5 h-5 text-gray-400" />
                  <span className="text-[14px] font-semibold text-gray-700">Profile Settings</span>
                </Link>
              </DropdownMenuItem>
              
              <DropdownMenuItem className="rounded-xl focus:bg-gray-50 cursor-pointer outline-none">
                <Link to="/pricing" className="flex items-center gap-4 px-3 py-2.5 w-full">
                  <LuCreditCard className="w-5 h-5 text-gray-400" />
                  <span className="text-[14px] font-semibold text-gray-700">Billing & Plan</span>
                </Link>
              </DropdownMenuItem>

              <div className="h-0.5 bg-gray-100 my-1 mx-2" />

              <LogoutModal onConfirm={handleLogout}>
                <DropdownMenuItem 
                  className="rounded-xl focus:bg-red-50 text-red-600 cursor-pointer outline-none"
                  onSelect={(e) => e.preventDefault()}
                >
                  <div className="flex items-center gap-4 px-3 py-2.5 w-full">
                    <LuLogOut className="w-5 h-5" />
                    <span className="text-[14px] font-bold">Log out</span>
                  </div>
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