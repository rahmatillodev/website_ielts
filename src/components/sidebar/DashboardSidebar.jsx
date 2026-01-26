import { useLocation, Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  LuLayoutDashboard,
  LuBookOpen,
  LuHeadphones,
  LuSettings,
  LuStar,
  LuLogOut,
  LuChevronLeft,
  LuChevronRight,
} from "react-icons/lu";
import { FaChartSimple } from "react-icons/fa6";
import { Button } from "../ui/button";
import { GraduationCap } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import LogoutModal from "../modal/LogoutModal";
import { toast } from "react-toastify";
import { TfiWrite } from "react-icons/tfi";
import { RiSpeakLine } from "react-icons/ri";
import { IoDocumentAttachOutline } from "react-icons/io5";
import { Tooltip, TooltipTrigger, TooltipContent } from "../ui/tooltip";
import { useSmallScreen } from "@/hooks/useSmallScreen";
import LogoDesign from "../LogoDesign";
import { MdAutoStories } from "react-icons/md";

const SidebarItem = ({ icon: Icon, label, link, isActive, onNavigate, isCollapsed }) => {
  const content = (
    <Link
      to={link}
      onClick={onNavigate}
      className={`flex items-center gap-3 px-4 py-2.5 2xl:py-3 text-sm font-medium rounded-xl cursor-pointer transition-all duration-200
        ${isActive
          ? "bg-[#EBF5FF] text-[#4A90E2]"
          : "text-[#64748B] hover:text-gray-900 hover:bg-gray-50"
        }
        ${isCollapsed ? "mx-2 justify-center" : "mx-3"}
      `}
    >
      <Icon className={`w-5 h-5 2xl:w-6 2xl:h-6 shrink-0 ${isActive ? "text-[#4A90E2]" : "text-[#64748B]"}`} />
      {!isCollapsed && <span className="truncate">{label}</span>}
    </Link>
  );

  if (isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {content}
        </TooltipTrigger>
        <TooltipContent side="right">
          {label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return content;
};

const DashboardSidebar = ({ onNavigate }) => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const authUser = useAuthStore((state) => state.authUser);
  const userProfile = useAuthStore((state) => state.userProfile);
  const signOut = useAuthStore((state) => state.signOut);
  const isSmallScreen = useSmallScreen();

  // Load collapsed state from localStorage, default to false
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem("sidebarCollapsed");
    return saved ? JSON.parse(saved) : false;
  });

  // On small screens, always keep sidebar expanded (don't allow collapsing)
  const effectiveIsCollapsed = isSmallScreen ? false : isCollapsed;

  // Save collapsed state to localStorage whenever it changes (only for desktop)
  useEffect(() => {
    if (!isSmallScreen) {
      localStorage.setItem("sidebarCollapsed", JSON.stringify(isCollapsed));
    }
  }, [isCollapsed, isSmallScreen]);

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleLogout = async () => {
    const result = await signOut();
    if (result.success) {
      toast.success("Logged out successfully");
      navigate("/");
    } else {
      toast.error(result.error);
    }
  };

  const checkActive = (link) => pathname === link;

  return (
    <aside className={`flex flex-col h-screen sticky top-0 z-20 bg-white border-0 md:border-r border-gray-100 font-sans transition-all duration-300 ${effectiveIsCollapsed ? "w-[80px] 2xl:w-[90px]" : "w-[280px] 2xl:w-[320px]"
      }`}>

      {/* Logo qismi - balandlik qisqardi */}
      <div className={`h-20 2xl:h-24 shrink-0  flex items-center relative px-4 2xl:px-6 overflow-visible ${effectiveIsCollapsed ? "justify-center" : "justify-between"
        }`}>
        <>
          {!isCollapsed ? (
            <>
              <div className="flex items-center gap-3">
                {/* <div className="size-10 2xl:size-12 bg-[#EBF5FF] rounded-xl flex items-center justify-center">
                  <GraduationCap className="text-[#4A90E2] size-6 2xl:size-7" />
                </div>
                <span className="text-lg 2xl:text-xl font-black text-[#1E293B] tracking-tight">
                  IELTSCORE
                </span> */}
                <LogoDesign/>
                <span className="text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-bold">
                  Beta
                </span>
              </div>

            </>
          ) : (
            <div className="flex flex-col items-center gap-2 w-full">
               <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: "#1990e6" }}>
        <MdAutoStories className="text-white" size={24} />
      </div>

            </div>
          )}
          {/* Only show collapse button on desktop (not on small screens) */}
          {!isSmallScreen && (
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="absolute top-10  -translate-y-1/2 right-0 translate-x-1/2
              bg-white border border-gray-200 rounded-full p-1.5 shadow-sm hover:bg-gray-50 z-20"
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? (
                <LuChevronRight className="w-4 h-4 text-gray-500" />
              ) : (
                <LuChevronLeft className="w-4 h-4 text-gray-500" />
              )}
            </button>
          )}


        </>
      </div>

      {/* Navigatsiya - paddinglar qisqardi */}
      <nav className="flex-1 overflow-y-auto py-1 2xl:py-2 scrollbar-hide space-y-0.5 2xl:space-y-1">
        <SidebarItem
          icon={LuLayoutDashboard}
          label="Dashboard"
          link="/dashboard"
          isActive={checkActive("/dashboard")}
          onNavigate={onNavigate}
          isCollapsed={effectiveIsCollapsed}
        />

        {!effectiveIsCollapsed && (
          <div className="mt-0 2xl:mt-2 px-4 2xl:px-7 text-[10px] 2xl:text-[11px] font-black text-[#94A3B8] uppercase tracking-[1.5px]">
            Practice
          </div>
        )}
        <SidebarItem
          icon={LuBookOpen}
          label="Reading"
          link="/reading"
          isActive={pathname.startsWith("/reading")}
          onNavigate={onNavigate}
          isCollapsed={effectiveIsCollapsed}
        />
        <SidebarItem
          icon={LuHeadphones}
          label="Listening"
          link="/listening"
          isActive={checkActive("/listening")}
          onNavigate={onNavigate}
          isCollapsed={effectiveIsCollapsed}
        />
        <SidebarItem
          icon={TfiWrite}
          label="Writing"
          link="/writing"
          isActive={checkActive("/writing")}
          onNavigate={onNavigate}
          isCollapsed={effectiveIsCollapsed}
        />
        <SidebarItem
          icon={RiSpeakLine}
          label="Speaking"
          link="/speaking"
          isActive={checkActive("/speaking")}
          onNavigate={onNavigate}
          isCollapsed={effectiveIsCollapsed}
        />

        {!effectiveIsCollapsed && (
          <div className="mt-2 xl:mt-4 px-4 2xl:px-7 text-[10px] 2xl:text-[11px] font-black text-[#94A3B8] uppercase tracking-[1.5px]">
            Tests & Analytics
          </div>
        )}
        <SidebarItem
          icon={IoDocumentAttachOutline}
          label="Mock Tests"
          link="/mock-tests"
          isActive={checkActive("/mock-tests")}
          onNavigate={onNavigate}
          isCollapsed={effectiveIsCollapsed}
        />
        <SidebarItem
          icon={FaChartSimple}
          label="Analytics"
          link="/analytics"
          isActive={checkActive("/analytics")}
          onNavigate={onNavigate}
          isCollapsed={effectiveIsCollapsed}
        />

        {!effectiveIsCollapsed && (
          <div className="mt-2 xl:mt-4 px-7 text-[10px] 2xl:text-[11px] font-black text-[#94A3B8] uppercase tracking-[1.5px]">
            Account
          </div>
        )}
        <SidebarItem
          icon={LuSettings}
          label="Profile Settings"
          link="/profile"
          isActive={checkActive("/profile")}
          onNavigate={onNavigate}
          isCollapsed={effectiveIsCollapsed}
        />
      </nav>

      <div className="p-3 2xl:p-4 border-t border-gray-50 bg-white shrink-0 space-y-2 2xl:space-y-3">
        {userProfile?.subscription_status !== "premium" && !effectiveIsCollapsed && (
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

        {userProfile?.subscription_status !== "premium" && effectiveIsCollapsed && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                to="/pricing"
                className="flex items-center justify-center p-3 bg-[#4B8EE3] rounded-xl hover:bg-[#3a7bc8] transition-colors"
              >
                <LuStar size={20} className="text-white" fill="currentColor" />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">
              Upgrade to Pro
            </TooltipContent>
          </Tooltip>
        )}

        <LogoutModal onConfirm={handleLogout}>
          {effectiveIsCollapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="flex items-center justify-center p-3 w-full bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-xl transition-all active:scale-[0.95]">
                  <LuLogOut className="w-4 h-4 2xl:w-5 2xl:h-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                Log out
              </TooltipContent>
            </Tooltip>
          ) : (
            <button className="flex items-center gap-3 px-5 py-2.5 w-full bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-xl transition-all active:scale-[0.95] text-[13px]">
              <LuLogOut className="w-4 h-4 2xl:w-5 2xl:h-5" /> Log out
            </button>
          )}
        </LogoutModal>
      </div>
    </aside>
  );
};

export default DashboardSidebar;