import { useLocation, Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";

import {
  LuLayoutDashboard,
  LuBookOpen,
  LuHeadphones,
  LuSettings,
  LuLogOut,
  LuChevronLeft,
  LuChevronRight,
} from "react-icons/lu";
import { FaChartSimple } from "react-icons/fa6";
import { useAuthStore } from "@/store/authStore";
import LogoutModal from "../modal/LogoutModal";
import { toast } from "react-toastify";
import { TfiWrite } from "react-icons/tfi";
import { RiSpeakLine } from "react-icons/ri";
import { IoDocumentAttachOutline } from "react-icons/io5";
import { Tooltip, TooltipTrigger, TooltipContent } from "../ui/tooltip";
import LogoDesign from "@/components/LogoDesign";

const SidebarItem = ({ icon: Icon, label, link, isActive, onNavigate, isCollapsed }) => {
  const item = (
    <Link
      to={link}
      onClick={onNavigate}
      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition
        ${isActive ? "bg-[#EBF5FF] text-[#1990e6]" : "text-[#64748B] hover:bg-gray-50"}
        ${isCollapsed ? "justify-center mx-2" : "mx-3"}`}
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

const DashboardSidebar = ({ onNavigate }) => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const signOut = useAuthStore((s) => s.signOut);

  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem("sidebarCollapsed");
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    localStorage.setItem("sidebarCollapsed", JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  const handleLogout = async () => {
    const res = await signOut();
    res.success ? navigate("/login") : toast.error(res.error);
  };

  return (
    <aside
      className={`relative h-screen sticky top-0 bg-white border-r transition-all duration-300
      ${isCollapsed ? "w-[80px]" : "w-[280px]"}`}
    >
      {/* ===== HEADER ===== */}
      <div className="relative h-16 flex items-center px-4">
        {/* LOGO + BETA */}
        <Link
          to="/dashboard"
          className={`flex items-center gap-2 overflow-hidden transition-all duration-300
          ${isCollapsed ? "mx-auto" : ""}`}
        >
          <LogoDesign />
          {!isCollapsed && (
            <span className="ml-1 text-xs bg-red-500 text-white px-2 py-0.5 rounded-full font-semibold">
              Beta
            </span>
          )}
        </Link>

        {/* < > TOGGLE — EXACT CENTER ON BORDER */}
        <button
  onClick={() => setIsCollapsed(!isCollapsed)}
  className="absolute top-1/2 -translate-y-1/2 right-0 translate-x-1/2
  bg-white border rounded-full p-1.5 shadow-sm hover:bg-gray-50"
>
  {isCollapsed ? (
    <LuChevronRight className="w-4 h-4 text-gray-600" />
  ) : (
    <LuChevronLeft className="w-4 h-4 text-gray-600" />
  )}
</button>

      </div>

      {/* ===== MENU ===== */}
      <nav className="mt-2 space-y-1">
        <SidebarItem icon={LuLayoutDashboard} label="Dashboard" link="/dashboard" isActive={pathname === "/dashboard"} isCollapsed={isCollapsed} />
        <SidebarItem icon={LuBookOpen} label="Reading Practice" link="/reading" isActive={pathname.startsWith("/reading")} isCollapsed={isCollapsed} />
        <SidebarItem icon={LuHeadphones} label="Listening Practice" link="/listening" isActive={pathname === "/listening"} isCollapsed={isCollapsed} />
        <SidebarItem icon={TfiWrite} label="Writing Practice" link="/writing" isActive={pathname === "/writing"} isCollapsed={isCollapsed} />
        <SidebarItem icon={RiSpeakLine} label="Speaking Practice" link="/speaking" isActive={pathname === "/speaking"} isCollapsed={isCollapsed} />
        <SidebarItem icon={IoDocumentAttachOutline} label="Mock Tests" link="/mock-tests" isActive={pathname === "/mock-tests"} isCollapsed={isCollapsed} />
        <SidebarItem icon={FaChartSimple} label="Analytics" link="/analytics" isActive={pathname === "/analytics"} isCollapsed={isCollapsed} />
        <SidebarItem icon={LuSettings} label="Profile Settings" link="/profile" isActive={pathname === "/profile"} isCollapsed={isCollapsed} />
      </nav>

      {/* ===== FOOTER ===== */}
      <div className="p-3 border-t mt-auto">
        <LogoutModal onConfirm={handleLogout}>
          <button className="flex items-center gap-2 text-red-600 font-bold">
            <LuLogOut className="w-4 h-4" /> {!isCollapsed && "Log out"}
          </button>
        </LogoutModal>
      </div>
    </aside>
  );
};

export default DashboardSidebar;
