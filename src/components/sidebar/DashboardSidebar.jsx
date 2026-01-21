import { useLocation, Link, useNavigate } from "react-router-dom";
import {
  LuLayoutDashboard,
  LuBookOpen,
  LuHeadphones,
  LuSettings,
  LuStar,
  LuLogOut,
} from "react-icons/lu";
import { FaChartSimple } from "react-icons/fa6";
import { Button } from "../ui/button";
import { GraduationCap } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import LogoutModal from "../modal/LogoutModal";
import { toast } from "react-toastify";
import { TfiWrite } from "react-icons/tfi";
import { RiSpeakLine } from "react-icons/ri";

const SidebarItem = ({ icon: Icon, label, link, isActive, onNavigate }) => (
  <Link
    to={link}
    onClick={onNavigate}
    className={`flex mx-3 items-center gap-3 px-4 py-2.5 2xl:py-3 text-sm font-medium rounded-xl cursor-pointer transition-all duration-200
      ${isActive
        ? "bg-[#EBF5FF] text-[#4A90E2]"
        : "text-[#64748B] hover:text-gray-900 hover:bg-gray-50"
      }`}
  >
    <Icon className={`w-5 h-5 2xl:w-6 2xl:h-6 ${isActive ? "text-[#4A90E2]" : "text-[#64748B]"}`} />
    <span className="truncate">{label}</span>
  </Link>
);

const DashboardSidebar = ({ onNavigate }) => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const authUser = useAuthStore((state) => state.authUser);
  const userProfile = useAuthStore((state) => state.userProfile);
  const signOut = useAuthStore((state) => state.signOut);

  const handleLogout = async () => {
    const result = await signOut();
    if (result.success) {
      toast.success("Logged out successfully");
      navigate("/login");
    } else {
      toast.error(result.error);
    }
  };


  const checkActive = (link) => pathname === link;

  return (
    <aside className="flex flex-col w-[280px] 2xl:w-[320px] h-screen sticky top-0 bg-white border-r border-gray-100 font-sans overflow-hidden">

      {/* Logo qismi - balandlik qisqardi */}
      <div className="h-20 2xl:h-24 shrink-0 flex items-center px-6">
        <div className="flex items-center gap-3">
          <div className="size-10 2xl:size-12 bg-[#EBF5FF] rounded-xl flex items-center justify-center">
            <GraduationCap className="text-[#4A90E2] size-6 2xl:size-7" />
          </div>
          <span className="text-lg 2xl:text-xl font-black text-[#1E293B] tracking-tight">
            IELTS Sim
          </span>
        </div>
      </div>

      {/* Navigatsiya - paddinglar qisqardi */}
      <nav className="flex-1 overflow-y-auto py-1 2xl:py-2 scrollbar-hide space-y-0.5 2xl:space-y-1">
        <SidebarItem
          icon={LuLayoutDashboard}
          label="Dashboard"
          link="/dashboard"
          isActive={checkActive("/dashboard")}
          onNavigate={onNavigate}
        />
        <SidebarItem
          icon={LuBookOpen}
          label="Reading Practice"
          link="/reading"
          isActive={pathname.startsWith("/reading")}
          onNavigate={onNavigate}
        />
        <SidebarItem
          icon={LuHeadphones}
          label="Listening Practice"
          link="/listening"
          isActive={checkActive("/listening")}
          onNavigate={onNavigate}
        />
        <SidebarItem
          icon={TfiWrite}
          label="Writing Practice"
          link="/writing"
          isActive={checkActive("/writing")}
          onNavigate={onNavigate}
        />
        <SidebarItem
          icon={RiSpeakLine}
          label="Speaking Practice"
          link="/speaking"
          isActive={checkActive("/speaking")}
          onNavigate={onNavigate}
        />
        <SidebarItem
          icon={FaChartSimple}
          label="Analytics"
          link="/analytics"
          isActive={checkActive("/analytics")}
          onNavigate={onNavigate}
        />

        <div className="mt-4 2xl:mt-8 px-7 text-[10px] 2xl:text-[11px] font-black text-[#94A3B8] uppercase tracking-[1.5px] mb-2">
          Account
        </div>
        <SidebarItem
          icon={LuSettings}
          label="Profile Settings"
          link="/profile"
          isActive={checkActive("/profile")}
          onNavigate={onNavigate}
        />
      </nav>

      {/* Pastki qism - ixchamroq dizayn */}
      <div className="p-3 2xl:p-4 border-t border-gray-50 bg-white shrink-0 space-y-2 2xl:space-y-3">
        {userProfile?.subscription_status !== "premium" && (
          <div className="p-5 bg-[#4B8EE3] rounded-[24px] relative overflow-hidden shadow-lg shadow-blue-100  sm:block">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-white/20 rounded-xl text-white">
                <LuStar size={20} fill="currentColor" />
              </div>
              <span className="px-3 py-1 bg-white/20 rounded-full text-[10px] font-black text-white uppercase tracking-wider">
                Free Plan
              </span>
            </div>
            <div className="text-[17px] font-black text-white mb-1">Upgrade to Pro</div>
            <p className="text-[12px] text-white/80 font-medium leading-tight mb-5">
              Unlock unlimited tests and AI scoring.
            </p>
            <Link to="/pricing">
              <Button className="w-full bg-white hover:bg-blue-50 text-[#4B8EE3] font-semibold py-5 rounded-xl border-none shadow-sm active:scale-[0.98] transition-all text-[13px]">
                View Plans
              </Button>
            </Link>
          </div>
        )}

        <LogoutModal onConfirm={handleLogout}>
          <button className="flex items-center gap-3 px-5 py-2.5 w-full bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-xl transition-all active:scale-[0.95] text-[13px]">
            <LuLogOut className="w-4 h-4 2xl:w-5 2xl:h-5" /> Log out
          </button>
        </LogoutModal>
      </div>
    </aside>
  );
};

export default DashboardSidebar;