import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LuUser, LuSettings, LuLogOut, LuChevronDown } from "react-icons/lu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Link } from 'react-router-dom';
import LogoutModal from '../modal/LogoutModal';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';

const DashboardNavbar = () => {
  const navigate = useNavigate();
  const authUser = useAuthStore((state) => state.authUser);
  const userProfile = useAuthStore((state) => state.userProfile);
  const signOut = useAuthStore((state) => state.signOut);

  // Get user display name from profile or email
  const displayName = userProfile?.full_name || authUser?.email?.split('@')[0] || 'User';
  const userRole = userProfile?.role === 'admin' ? 'Admin' : 'User';
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

  // Get initials for avatar
  const getInitials = () => {
    if (userProfile?.full_name) {
      const names = userProfile.full_name.split(' ');
      if (names.length >= 2) {
        return (names[0][0] + names[names.length - 1][0]).toUpperCase();
      }
      return userProfile.full_name.substring(0, 2).toUpperCase();
    }
    if (authUser?.email) {
      return authUser.email.substring(0, 2).toUpperCase();
    }
    return 'U';
  };

  return (
    <nav className="w-full h-20 bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="h-full px-8 flex items-center justify-end gap-6">
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-1.5 pr-3 rounded-2xl transition-all group">
              <Avatar className="size-10 border-2 border-transparent group-hover:border-blue-100">
                <AvatarImage src={null} className="object-cover" />
                <AvatarFallback className="bg-blue-50 text-blue-600 font-bold">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:flex flex-col items-start leading-tight">
                <p className="text-[14px] font-black text-gray-900">{displayName}</p>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-tighter">{subscriptionStatus}</p>
              </div>
              <LuChevronDown className="text-gray-400 group-hover:text-gray-900" size={16} />
            </div>
          </DropdownMenuTrigger>

          <DropdownMenuContent className="w-56 mt-2 rounded-2xl p-2 shadow-xl border-gray-100" align="end">
            <DropdownMenuLabel className="px-3 py-2 text-xs font-black text-gray-400 uppercase">My Account</DropdownMenuLabel>
            
            <DropdownMenuItem className="rounded-xl py-2.5 cursor-pointer focus:bg-blue-50 group">
              <Link to="/profile" className="flex items-center w-full gap-3">
                <LuUser size={18} className="text-gray-400 group-focus:text-blue-600" />
                <span className="font-bold">Profile Settings</span>
              </Link>
            </DropdownMenuItem>

            <DropdownMenuItem className="rounded-xl py-2.5 cursor-pointer focus:bg-blue-50 group">
              <Link to="/billing" className="flex items-center w-full gap-3">
                <LuSettings size={18} className="text-gray-400 group-focus:text-blue-600" />
                <span className="font-bold">Billing</span>
              </Link>
            </DropdownMenuItem>

            <DropdownMenuSeparator className="bg-gray-50 my-2" />

            {/* MODALNI SHU YERDA ISHLATAMIZ */}
            <LogoutModal onConfirm={handleLogout}>
              <DropdownMenuItem 
                className="rounded-xl py-2.5 cursor-pointer focus:bg-red-50 focus:text-red-600 group"
                onSelect={(e) => e.preventDefault()} // Modal ochilishi uchun menyu yopilishini to'xtatamiz
              >
                <div className="flex items-center w-full gap-3">
                  <LuLogOut size={18} className="text-gray-400 group-focus:text-red-600" />
                  <span className="font-bold">Log out</span>
                </div>
              </DropdownMenuItem>
            </LogoutModal>

          </DropdownMenuContent>
        </DropdownMenu>

      </div>
    </nav>
  );
};

export default DashboardNavbar;