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
  LuX,
} from "react-icons/lu";
import { FaChartSimple } from "react-icons/fa6";
import { Button } from "../ui/button";
import { useAuthStore } from "@/store/authStore";
import LogoutModal from "../modal/LogoutModal";
import { toast } from "react-toastify";
import { TfiWrite } from "react-icons/tfi";
import { RiSpeakLine } from "react-icons/ri";
import { IoDocumentAttachOutline } from "react-icons/io5";
import { Tooltip, TooltipTrigger, TooltipContent } from "../ui/tooltip";
import LogoDesign from "@/components/LogoDesign";

/* ================= SIDEBAR ITEM ================= */
const SidebarItem = ({ icon: Icon, label, link, isActive, onNavigate, isCollapsed }) => {
  const item = (
    <Link
      to={link}
      onClick={onNavigate}
      className={`flex items-center gap-4 px-5 py-3 text-[15px] font-semibold rounded-xl transition-all
        ${
          isActive
            ? "bg-[#EBF5FF] text-[#1990e6]"
            : "text-[#475569] hover:bg-gray-50"
        }
        ${isCollapsed ? "mx-5 w-12 h-12 justify-center px-0 gap-0" : "mx-3"}`}
    >
      <Icon className="w-5 h-5 shrink-0" />
      {!isCollapsed && <span className="truncate">{label}</span>}
    </Link>
  );

  return isCollapsed ? (
    <Tooltip>
      <TooltipTrigger asChild>{item}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  ) : (
    item
  );
};

/* ================= SIDEBAR ================= */
const DashboardSidebar = ({ onNavigate }) => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const userProfile = useAuthStore((s) => s.userProfile);
  const signOut = useAuthStore((s) => s.signOut);

  const [isMobile, setIsMobile] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem("sidebarCollapsed");
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 1024px)");
    const handleMediaChange = (event) => {
      const mobile = event.matches;
      setIsMobile(mobile);
      if (mobile) {
        setIsCollapsed(false);
      } else {
        const saved = localStorage.getItem("sidebarCollapsed");
        setIsCollapsed(saved ? JSON.parse(saved) : false);
      }
    };

    handleMediaChange(mediaQuery);
    mediaQuery.addEventListener("change", handleMediaChange);

    return () => mediaQuery.removeEventListener("change", handleMediaChange);
  }, []);

  useEffect(() => {
    if (!isMobile) {
      localStorage.setItem("sidebarCollapsed", JSON.stringify(isCollapsed));
    }
  }, [isCollapsed, isMobile]);

  const handleLogout = async () => {
    const res = await signOut();
    if (res.success) {
      toast.success("Logged out successfully");
      navigate("/login");
    } else {
      toast.error(res.error);
    }
  };

  const checkActive = (link) => pathname === link;

  return (
    <aside
      className={`relative flex flex-col h-screen sticky top-0 bg-white  border-gray-100 transition-all duration-300
      ${isCollapsed ? "w-[84px]" : "w-[300px]"}`}
    >
      {/* ===== HEADER (BUG-FREE) ===== */}
      <div className="relative h-20 flex items-center justify-center px-4 shrink-0">
        {/* LOGO — ALWAYS CENTERED */}
        <div className="flex items-center justify-center w-full pr-8">
          <Link to="/dashboard" className="flex items-center">
            <LogoDesign className={isCollapsed ? "[&>span]:hidden ml-6" : ""} />
          </Link>
          {!isCollapsed && (
            <span className="ml-2 text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-bold">
              Beta
            </span>
          )}
        </div>

        {/* TOGGLE — ALWAYS ON BORDER CENTER (DESKTOP) */}
        {!isMobile && (
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="absolute top-1/2 -translate-y-1/2 right-0 translate-x-1/2
            bg-white border border-gray-200 rounded-full p-1.5 shadow-sm hover:bg-gray-50 z-10"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <LuChevronRight className="w-4 h-4 text-gray-500" />
            ) : (
              <LuChevronLeft className="w-4 h-4 text-gray-500" />
            )}
          </button>
        )}

        {/* CLOSE BUTTON (MOBILE) */}
        {/* {isMobile && onNavigate && (
          <button
            type="button"
            onClick={onNavigate}
            className="absolute top-1/2 -translate-y-1/2 right-3
            bg-white border border-gray-200 rounded-full p-1.5 shadow-sm hover:bg-gray-50 z-10"
            aria-label="Close sidebar"
          >
            <LuX className="w-4 h-4 text-gray-500" />
          </button> */}
        {/* )} */}
      </div>

      {/* ===== NAV (SCROLLBAR REMOVED) ===== */}
      <nav className="flex-1 overflow-hidden py-2 space-y-1">
        <SidebarItem icon={LuLayoutDashboard} label="Dashboard" link="/dashboard" isActive={checkActive("/dashboard")} isCollapsed={isCollapsed} />

        {!isCollapsed && (
          <div className="px-8 mt-3 mb-1 text-[11px] font-black text-[#94A3B8] uppercase tracking-wider">
            Practice
          </div>
        )}

        <SidebarItem icon={LuBookOpen} label="Reading Practice" link="/reading" isActive={pathname.startsWith("/reading")} isCollapsed={isCollapsed} />
        <SidebarItem icon={LuHeadphones} label="Listening Practice" link="/listening" isActive={checkActive("/listening")} isCollapsed={isCollapsed} />
        <SidebarItem icon={TfiWrite} label="Writing Practice" link="/writing" isActive={checkActive("/writing")} isCollapsed={isCollapsed} />
        <SidebarItem icon={RiSpeakLine} label="Speaking Practice" link="/speaking" isActive={checkActive("/speaking")} isCollapsed={isCollapsed} />

        {!isCollapsed && (
          <div className="px-8 mt-4 mb-1 text-[11px] font-black text-[#94A3B8] uppercase tracking-wider">
            Tests & Analytics
          </div>
        )}

        <SidebarItem icon={IoDocumentAttachOutline} label="Mock Tests" link="/mock-tests" isActive={checkActive("/mock-tests")} isCollapsed={isCollapsed} />
        <SidebarItem icon={FaChartSimple} label="Analytics" link="/analytics" isActive={checkActive("/analytics")} isCollapsed={isCollapsed} />

        {!isCollapsed && (
          <div className="px-8 mt-2 mb-1 text-[11px] font-black text-[#94A3B8] uppercase tracking-wider">
            Account
          </div>
        )}

        <SidebarItem icon={LuSettings} label="Profile Settings" link="/profile" isActive={checkActive("/profile")} isCollapsed={isCollapsed} />
      </nav>

      {/* ===== FOOTER ===== */}
      <div className="p-4 border-t border-gray-50 shrink-0">
        {userProfile?.subscription_status !== "premium" && !isCollapsed && (
          <div className="p-5 bg-[#4B8EE3] rounded-[24px] text-white shadow-lg mb-3">
            <div className="font-black mb-1">Upgrade to Pro</div>
            <p className="text-sm opacity-90 mb-4">
              Unlock unlimited tests and AI scoring.
            </p>
            <Link to="/pricing">
              <Button className="w-full bg-white text-[#4B8EE3] font-semibold">
                View Plans
              </Button>
            </Link>
          </div>
        )}

        <LogoutModal onConfirm={handleLogout}>
          <button className="flex items-center gap-3 px-5 py-3 w-full bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-xl">
            <LuLogOut className="w-4 h-4" /> {!isCollapsed && "Log out"}
          </button>
        </LogoutModal>
      </div>
    </aside>
  );
};

export default DashboardSidebar;
