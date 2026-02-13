import { useLocation, Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  LuSettings,
  LuLogOut,
  LuChevronLeft,
  LuChevronRight,
} from "react-icons/lu";
import { IoDocumentAttachOutline } from "react-icons/io5";
import { useAuthStore } from "@/store/authStore";
import LogoutModal from "../modal/LogoutModal";
import { toast } from "react-toastify";
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

const MockTestSidebar = ({ onNavigate }) => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const authUser = useAuthStore((state) => state.authUser);
  const signOut = useAuthStore((state) => state.signOut);
  const isSmallScreen = useSmallScreen();

  // Load collapsed state from localStorage, default to false
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem("mockTestSidebarCollapsed");
    return saved ? JSON.parse(saved) : false;
  });

  // On small screens, always keep sidebar expanded (don't allow collapsing)
  const effectiveIsCollapsed = isSmallScreen ? false : isCollapsed;

  // Save collapsed state to localStorage whenever it changes (only for desktop)
  useEffect(() => {
    if (!isSmallScreen) {
      localStorage.setItem("mockTestSidebarCollapsed", JSON.stringify(isCollapsed));
    }
  }, [isCollapsed, isSmallScreen]);

  const handleLogout = async () => {
    const result = await signOut();
    if (result.success) {
      toast.success("Logged out successfully");
      navigate("/mock-tests");
    } else {
      toast.error(result.error);
    }
  };

  const checkActive = (link) => {
    if (link === "/mock-tests") {
      return pathname === "/mock-tests" || 
             pathname === "/mock" || 
             pathname.startsWith("/mock/") || 
             pathname.startsWith("/mock-test/");
    }
    return pathname === link;
  };

  return (
    <aside className={`flex flex-col h-screen sticky top-0 z-20 bg-white border-0 md:border-r border-gray-100 font-sans transition-all duration-300 ${effectiveIsCollapsed ? "w-[80px] 2xl:w-[90px]" : "w-[280px] 2xl:w-[320px]"
      }`}>

      {/* Logo section */}
      <div className={`h-20 2xl:h-24 shrink-0  flex items-center relative px-4 2xl:px-6 overflow-visible ${effectiveIsCollapsed ? "justify-center" : "justify-between"
        }`}>
        <>
          {!effectiveIsCollapsed ? (
            <>
              <div className="flex items-center gap-3">
                <LogoDesign />
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

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-1 2xl:py-2 scrollbar-hide space-y-0.5 2xl:space-y-1">
        <SidebarItem
          icon={IoDocumentAttachOutline}
          label="Mock Tests"
          link="/mock-tests"
          isActive={checkActive("/mock-tests")}
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
        <LogoutModal onConfirm={handleLogout}>
          {effectiveIsCollapsed ? (
            <button className="flex items-center justify-center p-3 w-full bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-xl transition-all active:scale-[0.95]">
              <LuLogOut className="w-4 h-4 2xl:w-5 2xl:h-5" />
            </button>
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

export default MockTestSidebar;

