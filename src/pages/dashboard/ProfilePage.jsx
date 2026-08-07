import React, { useState, useMemo, useEffect, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { toast } from "react-toastify";
import { HiOutlineCamera } from "react-icons/hi2";
import { FaCrown, FaTelegramPlane } from "react-icons/fa";
import { Send, Instagram, Phone, ArrowUpRight } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import SubscriptionCard from "@/components/cards/SubscriptionCard";
import ChangePasswordModal from "@/components/modal/ChangePasswordModal";
import UpgradeModal from "@/components/modal/UpgradeModal";

import { useAuthStore } from "@/store/authStore";
import { useFeedbacksStore } from "@/store/feedbacks";
import { isPremiumSubscriber } from "@/utils/isPremiumSubscriber";
import { CONTACT } from "@/lib/contact";
import {
  DEFAULT_TARGET_BAND,
  PHONE_PLACEHOLDER,
  buildProfileUpdate,
  formatUzPhone,
  isProfileUnchanged,
  isSavableTargetBand,
  isSavableUzPhone,
} from "@/utils/profileForm";

/**
 * Profile Settings.
 *
 * The page used to render every field as a `readOnly` input with no save button
 * anywhere on it — the real editing lived in a dialog that repeated the same
 * four fields. Fields you cannot type in, next to a dialog that duplicates them,
 * is the whole reason the screen read as confusing. So the page now owns the
 * editing: four inputs and one Save, with the photo handled directly on the
 * avatar.
 *
 * What it writes is unchanged. `buildProfileUpdate` is the dialog's own
 * normalisation (src/utils/profileForm.js) and it goes through the same
 * `updateUserProfile` store action, so an existing row is written exactly as it
 * was before. Email stays read-only because it belongs to the auth record, not
 * to this table.
 */

/** Avatar rules, matching what the upload path already accepted. */
const VALID_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

const SUPPORT_LINKS = [
  {
    key: "telegram",
    label: "Telegram",
    value: CONTACT.telegram,
    href: `https://t.me/${CONTACT.telegramUsername}`,
    Icon: FaTelegramPlane,
  },
  {
    key: "instagram",
    label: "Instagram",
    value: `@${CONTACT.instagram}`,
    href: `https://instagram.com/${CONTACT.instagram}`,
    Icon: Instagram,
  },
  {
    key: "phone",
    label: "Support number",
    value: CONTACT.phone,
    href: `tel:${CONTACT.phone.replace(/\s/g, "")}`,
    Icon: Phone,
  },
];

const ProfilePage = () => {
  const reduceMotion = useReducedMotion();

  const authUser = useAuthStore((state) => state.authUser);
  const userProfile = useAuthStore((state) => state.userProfile);
  const updateUserProfile = useAuthStore((state) => state.updateUserProfile);
  const uploadAvatar = useAuthStore((state) => state.uploadAvatar);
  const addFeedback = useFeedbacksStore((state) => state.addFeedback);

  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [message, setMessage] = useState("");
  const [sendingFeedback, setSendingFeedback] = useState(false);
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    full_name: "",
    telegram_username: "",
    phone_number: "",
    target_band_score: DEFAULT_TARGET_BAND,
  });

  // The form is seeded from the profile and re-seeded whenever it changes
  // underneath (a save elsewhere, a refetch after an avatar upload).
  useEffect(() => {
    if (!userProfile) return;
    setForm({
      full_name: userProfile.full_name ?? "",
      telegram_username: userProfile.telegram_username ?? "",
      phone_number: userProfile.phone_number ?? "",
      target_band_score: userProfile.target_band_score ?? DEFAULT_TARGET_BAND,
    });
  }, [userProfile]);

  const email = authUser?.email || "";
  const displayName = userProfile?.full_name?.trim() || email || "User";
  const isPremium = isPremiumSubscriber(userProfile);
  const premiumUntil = userProfile?.premium_until ? new Date(userProfile.premium_until) : null;

  const initials = useMemo(() => {
    const source = userProfile?.full_name?.trim() || email;
    return source ? source.substring(0, 2).toUpperCase() : "U";
  }, [userProfile?.full_name, email]);

  // The storage path is stable and served immutable, so a freshly uploaded photo
  // would keep showing the cached one. The version the upload bumps is what
  // makes the new file actually appear.
  const avatarSrc = useMemo(() => {
    const url = userProfile?.avatar_image;
    if (!url) return undefined;
    const version = userProfile?.avatar_version;
    return version ? `${url}${url.includes("?") ? "&" : "?"}v=${version}` : url;
  }, [userProfile?.avatar_image, userProfile?.avatar_version]);

  const unchanged = isProfileUnchanged(form, userProfile);
  const canSave = !unchanged && !saving;

  const setField = (name) => (event) => {
    const { value } = event.target;
    setForm((previous) => ({
      ...previous,
      [name]: name === "phone_number" ? formatUzPhone(value) : value,
    }));
  };

  const handleSave = async (event) => {
    event.preventDefault();
    if (!canSave) return;

    if (!isSavableUzPhone(form.phone_number)) {
      toast.error(`Enter the full phone number (${PHONE_PLACEHOLDER}) or leave it empty.`);
      return;
    }
    if (!isSavableTargetBand(form.target_band_score)) {
      toast.error("Target band score must be between 0 and 9.");
      return;
    }

    setSaving(true);
    try {
      const result = await updateUserProfile(buildProfileUpdate(form));
      if (result.success) {
        toast.success("Changes saved");
      } else {
        toast.error(result.error || "Could not save your changes. Please try again.");
      }
    } catch (error) {
      toast.error(error?.message || "Could not save your changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarPick = async (event) => {
    const file = event.target.files?.[0];
    // Cleared straight away so picking the same file twice still fires a change.
    event.target.value = "";
    if (!file) return;

    if (!VALID_IMAGE_TYPES.includes(file.type)) {
      toast.error("Choose a JPEG, PNG, GIF or WebP image.");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      toast.error("That image is larger than 5MB. Please choose a smaller one.");
      return;
    }

    setUploadingAvatar(true);
    try {
      // This one call uploads, stores the URL and refetches the profile, so the
      // new photo lands without a second write.
      const result = await uploadAvatar(file);
      if (result.success) {
        toast.success("Photo updated");
      } else {
        toast.error(result.error || "Could not upload that photo. Please try again.");
      }
    } catch (error) {
      toast.error(error?.message || "Could not upload that photo. Please try again.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleFeedback = async (event) => {
    event.preventDefault();
    if (!message.trim()) {
      toast.error("Please write a message first.");
      return;
    }

    setSendingFeedback(true);
    try {
      const result = await addFeedback({ message });
      if (result.success) {
        toast.success("Thanks — your feedback was sent");
        setMessage("");
      } else {
        toast.error(result.error || "Could not send your feedback. Please try again.");
      }
    } catch (error) {
      toast.error(error?.message || "Could not send your feedback. Please try again.");
    } finally {
      setSendingFeedback(false);
    }
  };

  // One quiet entrance for the page. No hover-scale on the cards: a settings
  // screen that flinches when the pointer crosses it reads as unstable.
  const section = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.35, ease: "easeOut" },
      };

  const CARD = "bg-white border border-gray-100 rounded-[24px] shadow-sm";
  const FIELD = "rounded-xl h-11 border-gray-200 bg-white focus-visible:ring-brand-100";
  const FIELD_LABEL = "text-sm font-semibold text-gray-700";

  return (
    <div className="min-h-screen bg-gray-50/50 font-sans">
      {/* The column grows in two steps rather than being pinned at one width:
          held at 1024px it left roughly a third of a QHD monitor empty on each
          side. It still stops at 1280px — a settings form read edge to edge on
          an ultrawide is worse than a generous margin, and the fields would
          stretch past a comfortable line length. */}
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 xl:max-w-6xl lg:px-8 lg:py-12 2xl:max-w-7xl">
        <motion.header className="mb-6 lg:mb-8" {...section}>
          <h1 className="text-2xl lg:text-3xl font-black text-gray-900">Profile Settings</h1>
          <p className="mt-1 text-sm lg:text-base text-gray-500 font-medium">
            Manage your personal information and preferences.
          </p>
        </motion.header>

        {/* ---------------------------------------------------------------
            1. Who you are — avatar, name, email, plan, in one compact strip
           --------------------------------------------------------------- */}
        <motion.section
          className={`${CARD} p-5 sm:p-6`}
          {...section}
          transition={{ ...section.transition, delay: reduceMotion ? 0 : 0.04 }}
        >
          <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:gap-5 sm:text-left">
            <div className="relative shrink-0">
              <Avatar className="size-20 border-2 border-gray-100 shadow-sm">
                <AvatarImage src={avatarSrc} alt="" className="object-cover" />
                <AvatarFallback className="bg-gray-100 text-gray-400 text-2xl font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>

              {uploadingAvatar ? (
                <span className="absolute inset-0 grid place-items-center rounded-full bg-white/70">
                  <span className="size-5 animate-spin rounded-full border-2 border-gray-300 border-t-brand-600" />
                </span>
              ) : null}

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                aria-label="Change profile photo"
                className="absolute -bottom-1 -right-1 grid size-8 place-items-center rounded-full border-4 border-white bg-primary text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover disabled:opacity-60"
              >
                <HiOutlineCamera size={14} aria-hidden />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarPick}
                className="hidden"
              />
            </div>

            {/* `w-full` is what makes the truncation work in the stacked layout:
                in a column flex container `flex-1` sizes the height, so without
                it the block is shrink-to-fit and a long name pushes the page
                sideways instead of ellipsing. */}
            <div className="w-full min-w-0 flex-1">
              <h2 className="truncate text-lg font-black text-gray-900">{displayName}</h2>
              <p className="truncate text-sm font-medium text-gray-500">{email || "No email"}</p>
            </div>

            <span
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold ${
                isPremium ? "bg-primary text-primary-foreground" : "bg-gray-100 text-gray-700"
              }`}
            >
              {isPremium ? <FaCrown className="w-3 h-3 shrink-0" aria-hidden /> : null}
              {isPremium ? "Premium" : "Free plan"}
            </span>
          </div>
        </motion.section>

        {/* ---------------------------------------------------------------
            2 + 3. What you can edit, beside what plan you are on
           --------------------------------------------------------------- */}
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <motion.form
            onSubmit={handleSave}
            className={`${CARD} lg:col-span-2`}
            {...section}
            transition={{ ...section.transition, delay: reduceMotion ? 0 : 0.08 }}
          >
            <div className="p-5 sm:p-6">
              <h2 className="text-base font-black text-gray-900">Personal information</h2>

              <div className="mt-5 grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="full-name" className={FIELD_LABEL}>
                    Full name
                  </Label>
                  <Input
                    id="full-name"
                    value={form.full_name}
                    onChange={setField("full_name")}
                    placeholder="Your name"
                    autoComplete="name"
                    className={FIELD}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="telegram" className={FIELD_LABEL}>
                    Telegram username
                  </Label>
                  <Input
                    id="telegram"
                    value={form.telegram_username}
                    onChange={setField("telegram_username")}
                    placeholder="@username"
                    className={FIELD}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className={FIELD_LABEL}>
                    Phone number
                  </Label>
                  <Input
                    id="phone"
                    value={form.phone_number}
                    onChange={setField("phone_number")}
                    maxLength={13}
                    inputMode="tel"
                    placeholder={PHONE_PLACEHOLDER}
                    className={FIELD}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="target-band" className={FIELD_LABEL}>
                    Target band score
                  </Label>
                  <Input
                    id="target-band"
                    type="number"
                    min="0"
                    max="9"
                    step="0.5"
                    value={form.target_band_score}
                    onChange={setField("target_band_score")}
                    placeholder="7.5"
                    className={FIELD}
                  />
                  {/* The only field whose valid range is not self-evident. */}
                  <p className="text-xs font-medium text-gray-500">Between 0 and 9</p>
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="email" className={FIELD_LABEL}>
                    Email address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    readOnly
                    aria-describedby="email-hint"
                    className="h-11 cursor-not-allowed rounded-xl border-gray-200 bg-gray-50 text-gray-500"
                  />
                  <p id="email-hint" className="text-xs font-medium text-gray-500">
                    Your email is used to sign in and cannot be changed here.
                  </p>
                </div>
              </div>
            </div>

            {/* The save action sits on its own rule so it is always the last
                thing in the card and never floats in whitespace. The dirty hint
                sits beside it so it is obvious both that something changed and
                where to commit it. */}
            <div className="flex flex-col-reverse items-stretch gap-3 border-t border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <p
                className="text-sm font-medium text-gray-500 sm:min-h-5"
                aria-live="polite"
              >
                {unchanged ? "" : "You have unsaved changes"}
              </p>
              <Button
                type="submit"
                disabled={!canSave}
                className="h-11 w-full rounded-xl bg-primary px-6 font-bold text-primary-foreground hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </motion.form>

          {/* Side by side while the page is one column, stacked once the page
              itself splits into two. Left as a single column throughout, these
              two short cards spanned the full tablet width and read as a label
              on the far left with its value stranded 600px away. */}
          <motion.div
            className="grid gap-6 sm:grid-cols-2 lg:grid-cols-1 lg:content-start"
            {...section}
            transition={{ ...section.transition, delay: reduceMotion ? 0 : 0.12 }}
          >
            <SubscriptionCard
              isPremium={isPremium}
              premiumUntil={premiumUntil}
              onUpgrade={isPremium ? undefined : () => setIsUpgradeOpen(true)}
            />

            <section className={`${CARD} p-6`} aria-labelledby="security-heading">
              <h2 id="security-heading" className="text-base font-black text-gray-900">
                Security
              </h2>
              <p className="mt-2 text-sm font-medium text-gray-500">
                Change the password you use to sign in.
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsChangePasswordOpen(true)}
                className="mt-4 h-11 w-full rounded-xl border-gray-200 font-semibold"
              >
                Change password
              </Button>
            </section>
          </motion.div>
        </div>

        {/* ---------------------------------------------------------------
            Support — contact details and a way to write in
           --------------------------------------------------------------- */}
        <motion.section
          className={`${CARD} mt-6 p-5 sm:p-6`}
          aria-labelledby="support-heading"
          {...section}
          transition={{ ...section.transition, delay: reduceMotion ? 0 : 0.16 }}
        >
          <h2 id="support-heading" className="text-base font-black text-gray-900">
            Help and support
          </h2>

          <div className="mt-5 grid gap-6 md:grid-cols-2">
            <ul className="space-y-2">
              {SUPPORT_LINKS.map(({ key, label, value, href, Icon }) => (
                <li key={key}>
                  <a
                    href={href}
                    target={href.startsWith("tel:") ? undefined : "_blank"}
                    rel="noreferrer"
                    className="group flex items-center gap-3 rounded-xl border border-gray-100 px-4 py-3 transition-colors hover:border-gray-200 hover:bg-gray-50"
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600">
                      <Icon size={16} aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-semibold uppercase tracking-wide text-gray-400">
                        {label}
                      </span>
                      <span className="block truncate text-sm font-bold text-gray-900">
                        {value}
                      </span>
                    </span>
                    <ArrowUpRight
                      size={16}
                      className="shrink-0 text-gray-300 transition-colors group-hover:text-gray-500"
                      aria-hidden
                    />
                  </a>
                </li>
              ))}
            </ul>

            <form onSubmit={handleFeedback} className="flex flex-col">
              <Label htmlFor="feedback" className={FIELD_LABEL}>
                Send feedback
              </Label>
              <textarea
                id="feedback"
                spellCheck="false"
                rows={4}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="How can we help you?"
                className="mt-2 w-full flex-1 resize-none rounded-xl border border-gray-200 bg-white p-3.5 text-sm text-gray-700 outline-none transition-shadow focus:border-brand-200 focus:ring-[3px] focus:ring-brand-100"
              />
              <Button
                type="submit"
                disabled={sendingFeedback || !message.trim()}
                className="mt-3 h-11 w-full rounded-xl bg-primary font-bold text-primary-foreground hover:bg-primary-hover disabled:opacity-50 sm:w-auto sm:self-end sm:px-6"
              >
                {sendingFeedback ? (
                  "Sending…"
                ) : (
                  <>
                    Submit <Send size={16} aria-hidden />
                  </>
                )}
              </Button>
            </form>
          </div>
        </motion.section>
      </div>

      <ChangePasswordModal
        open={isChangePasswordOpen}
        onOpenChange={setIsChangePasswordOpen}
      />
      <UpgradeModal open={isUpgradeOpen} onOpenChange={setIsUpgradeOpen} />
    </div>
  );
};

export default ProfilePage;
