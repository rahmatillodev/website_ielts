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

const SidebarItem = ({ icon: Icon, label, link, isActive }) => (
  <Link
    to={link}
    className={`flex mx-3 items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl cursor-pointer transition-all duration-200
      ${
        isActive
          ? "bg-[#EBF5FF] text-[#4A90E2]"
          : "text-[#64748B] hover:text-gray-900 hover:bg-gray-50"
      }`}
  >
    <Icon className={`w-6 h-6 ${isActive ? "text-[#4A90E2]" : "text-[#64748B]"}`} />
    {label}
  </Link>
);

const DashboardSidebar = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
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
    <aside className="flex flex-col w-[280px] h-screen bg-white border-r border-gray-100 font-sans">
      <div className="h-24 flex items-center px-6 mb-2">
        <div className="flex items-center gap-3">
          <div className="size-12 bg-[#EBF5FF] rounded-xl flex items-center justify-center">
            <GraduationCap className="text-[#4A90E2] size-7" />
          </div>
          <span className="text-xl font-black text-[#1E293B] tracking-tight">
            IELTS Sim
          </span>
        </div>
      </div>

      <nav className="flex-1 space-y-1">
        <SidebarItem
          icon={LuLayoutDashboard}
          label="Dashboard"
          link="/dashboard"
          isActive={checkActive("/dashboard")}
        />
        {/* ... boshqa SidebarItemlar ... */}
        <SidebarItem
          icon={LuBookOpen}
          label="Reading Practice"
          link="/reading"
          isActive={pathname.startsWith("/reading")}
        />
        <SidebarItem
          icon={LuHeadphones}
          label="Listening Practice"
          link="/listening"
          isActive={checkActive("/listening")}
        />
        <SidebarItem
          icon={FaChartSimple}
          label="Analytics"
          link="/analytics"
          isActive={checkActive("/analytics")}
        />

        <div className="mt-8 px-7 text-[11px] font-black text-[#94A3B8] uppercase tracking-[1.5px] mb-3">
          Account
        </div>
        <SidebarItem
          icon={LuSettings}
          label="Profile Settings"
          link="/profile"
          isActive={checkActive("/profile")}
        />
      </nav>

      <div className="p-3 space-y-3">
        {/* Upgrade Banner */}
        <div className="p-5 bg-[#4B8EE3] rounded-[24px] relative overflow-hidden shadow-lg shadow-blue-100">
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
            <Button className="w-full bg-white hover:bg-blue-50 text-[#4B8EE3] font-bold py-5 rounded-xl border-none shadow-sm active:scale-[0.98] transition-all text-[13px]">
              View Plans
            </Button>
          </Link>
        </div>

        {/* Logout Modal Integratsiyasi */}
        <LogoutModal onConfirm={handleLogout}>
          <button className="flex  items-center gap-3 px-6 py-3 w-full bg-red-50 hover:bg-red-200 hover:text-red-600 text-[#1E293B] font-medium rounded-xl transition-all active:scale-[0.95]">
            <LuLogOut className="w-5 h-5" /> Log out
          </button>
        </LogoutModal>
      </div>
    </aside>
  );
};

export default DashboardSidebar;