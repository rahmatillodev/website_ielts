import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { HiOutlinePencil } from "react-icons/hi2";
import { LuUserRound } from "react-icons/lu";
import { LiaExternalLinkAltSolid } from "react-icons/lia";
import { Crown, Send, Zap } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useSettingsStore } from "@/store/systemStore";
import { Link } from "react-router-dom";
import ProfileModal from "@/components/modal/ProfileModal";
import { format, differenceInCalendarDays } from "date-fns";
// Animation imports
import { motion } from "framer-motion";
import { useFeedbacksStore } from "@/store/feedbacks";
import { toast } from "react-toastify";

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.3,
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: "easeOut",
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: "easeOut",
    },
  },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const inputVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.3,
    },
  },
};

const ProfilePage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const authUser = useAuthStore((state) => state.authUser);
  const userProfile = useAuthStore((state) => state.userProfile);
  const settings = useSettingsStore((state) => state.settings);
  const addFeedback = useFeedbacksStore((state) => state.addFeedback);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const result = await addFeedback({
      message: message,
    });
    if (result.success) {
      toast.success("Feedback sent successfully");
      setMessage("");
    } else {
      toast.error(result.error);
    }
    setLoading(false);
  };

  return (
    <motion.div
      className="mx-auto min-h-screen bg-[#F8FAFC] p-6 lg:p-12 font-sans"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Header Sarlavha */}
      <motion.div className="mb-8" variants={itemVariants}>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-black text-gray-900">
            Account Settings
          </h1>

        </div>
        <p className="text-gray-500 font-medium">
          Manage your personal information and preferences.
        </p>
      </motion.div>

      <motion.div className="space-y-6" variants={staggerContainer}>
        {/* Personal Information Card */}
        <motion.div
          className="bg-white border border-gray-100 rounded-[24px] p-8 shadow-sm"
          variants={cardVariants}
          whileHover={{ scale: 1.01, transition: { duration: 0.2 } }}
        >
          <h2 className="text-xl font-black text-gray-900 mb-6">
            Personal Information
          </h2>

          <div className="flex flex-col gap-8">
            {/* Avatar Section */}
            <motion.div
              className="flex justify-between"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <div className="flex items-center gap-5">
                <motion.div
                  className="relative"
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <div
                    className={
                      isPremium
                        ? "p-1 bg-linear-to-br from-amber-400 via-orange-500 to-amber-400 rounded-full"
                        : ""
                    }
                  >
                    <Avatar
                      className={`size-24 shadow-sm ${isPremium
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
                  <motion.button
                    onClick={() => setIsModalOpen(true)}
                    className="absolute bottom-0 -right-1 p-2 bg-blue-500 text-white rounded-full border-4 border-white shadow-sm hover:bg-blue-600 transition-all"
                    whileHover={{ scale: 1.1, rotate: 15 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <HiOutlinePencil size={14} />
                  </motion.button>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.4 }}
                >
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-gray-900 leading-tight">
                      {fullName || email || "User"}
                    </h3>
                    {isPremium && (
                      <motion.div
                        className="p-1 bg-linear-to-br from-amber-400 to-orange-500 rounded-md"
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring", stiffness: 200, delay: 0.5 }}
                      >
                        <Zap size={12} className="text-white" fill="white" />
                      </motion.div>
                    )}
                  </div>
                  <p className="text-gray-400 font-medium">
                    {email || "No email"}
                  </p>
                </motion.div>
              </div>
              {isPremium && premiumUntil && (
                <motion.div
                  className="relative overflow-hidden rounded-[24px] p-8 shadow-xl"
                  initial={{ opacity: 0, scale: 0.9, x: 20 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.4, type: "spring" }}
                  whileHover={{ scale: 1.02 }}
                >
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
                    <motion.div className="mt-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
                      <div className="h-2 bg-gray-700/50 rounded-full overflow-hidden backdrop-blur-sm">
                        <motion.div
                          className="h-full bg-linear-to-r from-amber-400 to-orange-500 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${progressPercent}%` }}
                          transition={{ duration: 1, delay: 0.7, ease: "easeOut" }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-2 font-medium">
                        {Math.round(progressPercent)}% of subscription period
                        remaining
                      </p>
                    </motion.div>
                  </div>
                </motion.div>
              )}
            </motion.div>

            <hr className="border-gray-50" />

            {/* Form Inputs Grid */}
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6"
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
            >
              <motion.div className="space-y-2" variants={inputVariants}>
                <Label className="text-sm font-black text-gray-400 uppercase tracking-tighter">
                  First Name
                </Label>
                <Input
                  defaultValue={firstName}
                  placeholder="have don't name"
                  className="bg-gray-50/50 border-gray-100 cursor-default rounded-xl h-12 focus-visible:ring-blue-100"
                  readOnly
                />
              </motion.div>
              <motion.div className="space-y-2" variants={inputVariants}>
                <Label className="text-sm font-black text-gray-400 uppercase tracking-tighter">
                  telegram username
                </Label>
                <Input
                  defaultValue={tg_username}
                  placeholder="have don't telegram username"
                  className="bg-gray-50/50 cursor-default border-gray-100 rounded-xl h-12 focus-visible:ring-blue-100"
                  readOnly
                />
              </motion.div>
              <motion.div className="space-y-2" variants={inputVariants}>
                <Label className="text-sm font-black text-gray-400 uppercase tracking-tighter">
                  Email Address
                </Label>
                <Input
                  defaultValue={email}
                  type="email"
                  placeholder="have don't email"
                  className="bg-gray-50/50 cursor-default border-gray-100 rounded-xl h-12 focus-visible:ring-blue-100"
                  readOnly
                />
              </motion.div>
              <motion.div className="space-y-2" variants={inputVariants}>
                <Label className="text-sm font-black text-gray-400 uppercase tracking-tighter">
                  Phone Number
                </Label>
                <Input
                  defaultValue={phone_number}
                  placeholder="have don't phone number"
                  className="bg-gray-50/50 cursor-default border-gray-100 rounded-xl h-12 focus-visible:ring-blue-100"
                  readOnly
                />
              </motion.div>
            </motion.div>
          </div>
        </motion.div>

        {/* Contact Support Card */}
        <motion.div
          className="bg-white border border-gray-100 rounded-[24px] p-8 shadow-sm"
          variants={cardVariants}
          whileHover={{ scale: 1.01, transition: { duration: 0.2 } }}
        >


          <motion.div
            className="space-y-6 flex flex-col md:flex-row items-start justify-between gap-6"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            <div className="w-full md:w-1/2 space-y-3">
              {/* Telegram Support */}
              <motion.div
                className="flex items-center gap-3 mb-12"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
              >
                <motion.div
                  className="p-2.5 bg-blue-50 text-blue-500 rounded-xl"
                  whileHover={{ rotate: 360, scale: 1.1 }}
                  transition={{ duration: 0.5 }}
                >
                  <LuUserRound size={22} />
                </motion.div>
                <h2 className="text-xl font-black text-gray-900">
                  Contact support
                </h2>
              </motion.div>

              <motion.div className="space-y-1" variants={itemVariants}>
                <p className="text-sm font-black text-gray-900">Telegram</p>
                <motion.div
                  className="flex items-center gap-1"
                  whileHover={{ x: 5 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <Link to={settings?.telegram_admin_username} target="_blank">
                    <p className="text-sm font-semibold text-gray-400 leading-none">
                      {settings.telegram_admin_username}
                    </p>
                  </Link>
                  <LiaExternalLinkAltSolid
                    size={18}
                    className="text-gray-400 mb-0.5"
                  />
                </motion.div>
              </motion.div>

              <hr className="border-gray-50" />

              {/* Email Support */}
              <motion.div className="space-y-1" variants={itemVariants}>
                <p className="text-sm font-black text-gray-900">Email</p>
                <motion.div
                  className="flex items-center gap-1"
                  whileHover={{ x: 5 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <Link to={settings?.support_link} target="_blank">
                    <p className="text-sm font-semibold text-gray-400">
                      {settings.support_link}{" "}
                    </p>
                  </Link>
                  <LiaExternalLinkAltSolid
                    size={18}
                    className="text-gray-400 mb-0.5"
                  />
                </motion.div>
              </motion.div>

              <hr className="border-gray-50" />

              {/* Support Number */}
              <motion.div className="space-y-1" variants={itemVariants}>
                <p className="text-sm font-black text-gray-900">Support Number</p>
                <motion.div
                  className="flex items-center gap-1"
                  whileHover={{ x: 5 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <a
                    href={
                      settings?.phone_number
                        ? `tel:${settings.phone_number}`
                        : "#"
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <p className="text-sm font-semibold text-gray-400">
                      {settings?.phone_number
                        ? settings.phone_number
                        : "Not available"}
                    </p>
                  </a>
                  <LiaExternalLinkAltSolid
                    size={18}
                    className="text-gray-400 mb-0.5"
                  />
                </motion.div>
              </motion.div>
            </div>
            <motion.div variants={itemVariants} className="bg-gray-50 p-6 rounded-2xl border border-gray-100 w-full md:w-1/3 mx-auto">
              <h3 className="text-lg font-black text-gray-900 mb-4">Send Feedback</h3>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <textarea
                    required
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="How can we help you?"
                    className="w-full p-4 text-sm bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none text-gray-700"
                  />
                </div>

                <motion.button
                  whileTap={{ scale: 0.95 }}
                  disabled={loading}
                  type="submit"
                  className="w-full py-3 bg-blue-500 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-blue-600 transition-colors disabled:opacity-50"
                >
                  {loading ? (
                    "Sending..."
                  ) : (
                    <>
                      Submit <Send size={16} />
                    </>
                  )}
                </motion.button>

                {status === 'success' && (
                  <p className="text-xs text-green-600 font-semibold text-center mt-2">
                    Thank you! Your feedback has been sent.
                  </p>
                )}
              </form>
            </motion.div>
          </motion.div>
        </motion.div>
      </motion.div>

      <ProfileModal open={isModalOpen} onOpenChange={setIsModalOpen} />
    </motion.div>
  );
};

export default ProfilePage;
