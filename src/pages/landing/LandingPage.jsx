import React, { useEffect, useRef } from "react";
import { motion, useInView, useAnimation } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  LuMic,
  LuFileText,
  LuArrowRight,
  LuHeadphones,
  LuBookOpen,
  LuPenTool,
  LuTrendingUp,
} from "react-icons/lu";
import { Link } from "react-router-dom";

// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.6 } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5 } }
};

// Изображения из public/images/humans для аватарок
const MEN_IMAGES = [
  "/images/humans/men/загрузка (14).jpg",
  "/images/humans/men/загрузка (16).jpg",
  "/images/humans/men/загрузка (4).jpg",
  "/images/humans/men/загрузка (7).jpg",
  "/images/humans/men/загрузка.jpg",
  "/images/humans/men/загрузка23.jpg",
];

const WOMEN_IMAGES = [
  "/images/humans/women/feedback1-woman.jpg",
  "/images/humans/women/загрузка (18).jpg",
  "/images/humans/women/загрузка (2).jpg",
  "/images/humans/women/загрузка (20).jpg",
  "/images/humans/women/загрузка (3).jpg",
  "/images/humans/women/загрузка (5).jpg",
];

// Mock data для карточек отзывов
const TESTIMONIALS_MOCK = [
  { name: "Dilshodbek R.", subtitle: "WIUT Student", quote: "The analytics provided by IELTSCORE were eye-opening. I finally understood why my Writing score was stuck at 6.0 and managed to push it to 7.5 in just 3 weeks.", emoji: "📈", result: "Improved from 6.0 to 7.5", avatar: MEN_IMAGES[0] },
  { name: "Sarah Jenkins", subtitle: "International Student", quote: "Highly realistic interface. On the actual test day, I felt completely at home because the SIM environment was identical. Achieved a Band 8.5 overall!", emoji: "🎯", result: "Achieved Band 8.5", avatar: WOMEN_IMAGES[0] },
  { name: "Azamat K.", subtitle: "TUIT Tech Graduate", quote: "I used to struggle with the Speaking section. The feedback provided on the SIM was practical and directly applicable. I jumped from 6.5 to 8.0.", emoji: "🚀", result: "Improved from 6.5 to 8.0", avatar: MEN_IMAGES[1] },
  { name: "Nodira S.", subtitle: "MDIS Student", quote: "The Listening practice tests are incredibly close to the real exam. I improved my focus and note-taking skills. Reading and Listening both went from 6.5 to 8.0.", emoji: "📊", result: "Improved from 6.5 to 8.0", avatar: WOMEN_IMAGES[1] },
  { name: "Jasur T.", subtitle: "Webster University", quote: "AI Writing feedback is a game-changer. I knew exactly what to fix before my real test. My essay structure and coherence improved dramatically.", emoji: "💪", result: "Improved from 6.0 to 7.5", avatar: MEN_IMAGES[2] },
  { name: "Madina A.", subtitle: "TSUL Graduate", quote: "The analytics provided by IELTSCORE were eye-opening. I finally understood why my Writing score was stuck at 6.0 and managed to push it to 7.5 in just 3 weeks.", emoji: "⭐", result: "Improved from 6.0 to 7.5", avatar: WOMEN_IMAGES[2] },
  { name: "Oliver Chen", subtitle: "Exchange Student", quote: "Score Predictor helped me set realistic goals. I knew I was ready when it showed 7.5+. The full mock tests built my stamina for the real 3-hour exam.", emoji: "🎓", result: "Achieved Band 7.5", avatar: MEN_IMAGES[3] },
  { name: "Aisha M.", subtitle: "WIUT Student", quote: "Speaking mock tests with AI evaluation were exactly what I needed. I got used to the format and reduced my nervousness. Went from 6.0 to 7.5 in Speaking.", emoji: "🗣️", result: "Improved from 6.0 to 7.5", avatar: WOMEN_IMAGES[3] },
  { name: "David Kim", subtitle: "International Student", quote: "Best investment for IELTS prep. The combination of practice tests, instant feedback, and score tracking kept me motivated. Overall Band 8.0 on first attempt!", emoji: "🏆", result: "Achieved Band 8.0", avatar: MEN_IMAGES[4] },
  { name: "Zebo K.", subtitle: "TUIT Student", quote: "Vocabulary lists and study guides are well structured. I used them alongside the mock tests. Reading improved from 5.5 to 7.0 in 2 months.", emoji: "📚", result: "Improved from 5.5 to 7.0", avatar: WOMEN_IMAGES[4] },
  { name: "Emma Wilson", subtitle: "MDIS Graduate", quote: "I tried other platforms before IELTSCORE. This one felt the most authentic. Writing task 2 feedback pointed out my logical gaps — that alone was worth it.", emoji: "✨", result: "Achieved Band 7.5", avatar: WOMEN_IMAGES[5] },
  { name: "Rustam B.", subtitle: "TSUL Student", quote: "Listening and Reading sections are spot-on. The difficulty progression in practice tests prepared me well. Got 8.0 in both on the real exam.", emoji: "🎧", result: "Achieved 8.0 in L & R", avatar: MEN_IMAGES[5] },
];

// Animated Section Component
const AnimatedSection = ({ children, className = "", id = "" }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const controls = useAnimation();

  useEffect(() => {
    if (isInView) {
      controls.start("visible");
    }
  }, [isInView, controls]);

  return (
    <motion.section
      ref={ref}
      initial="hidden"
      animate={controls}
      variants={staggerContainer}
      className={className}
      id={id}
    >
      {children}
    </motion.section>
  );
};

// Animated Counter Component
const AnimatedCounter = ({ value, suffix = "", duration = 2 }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const [count, setCount] = React.useState(0);

  useEffect(() => {
    if (!isInView) return;
    
    const numericValue = parseFloat(value.replace(/[^0-9.]/g, ''));
    if (isNaN(numericValue)) {
      setCount(value);
      return;
    }
    
    const startTime = Date.now();
    const endTime = startTime + duration * 1000;

    const animate = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / (endTime - startTime), 1);
      const current = Math.floor(numericValue * progress);
      setCount(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setCount(numericValue);
      }
    };

    animate();
  }, [isInView, value, duration]);

  return <span ref={ref}>{count}{suffix}</span>;
};

const LandingPage = () => {
  const progressRef = useRef(null);
  const [progress, setProgress] = React.useState(0);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Animate progress circle
          let current = 0;
          const target = 82;
          const duration = 1500;
          const increment = target / (duration / 16);

          const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
              current = target;
              clearInterval(timer);
            }
            setProgress(current);
          }, 16);
        }
      },
      { threshold: 0.5 }
    );

    if (progressRef.current) {
      observer.observe(progressRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen " id="home">

      {/* ================= HERO ================= */}
      <section className="min-h-[90vh] lg:min-h-screen bg-linear-to-br from-[#F8FAFC] via-[#F0F7FF] to-[#EEF5FF] flex items-center py-6 sm:py-8 md:py-8 lg:py-12 px-4 sm:px-6 md:px-8 lg:px-8 overflow-hidden relative">
        <div className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-linear-to-br from-[#E0F2FF] via-[#CFE8FF] to-transparent blur-3xl opacity-70" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-72 w-72 rounded-full bg-linear-to-br from-[#E7F5FF] via-[#D6EBFF] to-transparent blur-3xl opacity-60" />
        <div className="max-w-full lg:max-w-10/12 flex flex-col md:flex-col lg:flex-row justify-between gap-4 sm:gap-6 md:gap-6 lg:gap-12 items-center w-full mx-auto">

          {/* LEFT */}
          <motion.div 
            className="space-y-3 sm:space-y-4 md:space-y-5 lg:space-y-8 text-center md:text-center lg:text-left w-full lg:w-auto"
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
          >
            <motion.div 
              variants={fadeInUp}
              className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-100 border border-blue-300 rounded-full"
            >
              <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></span>
              <span className="text-[10px] sm:text-xs font-semibold text-blue-600 uppercase whitespace-nowrap">
                NEW: AI Evaluated Mock Tests
              </span>
            </motion.div>

            <motion.h1 
              variants={fadeInUp}
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-semibold text-gray-900 leading-tight"
            >
              Build Skills,<br />
              Boost Scores,<br />
              Master <span className="text-[#4A90E2]">IELTS.</span>
            </motion.h1>

            <motion.p 
              variants={fadeInUp}
              className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-600 max-w-xl mx-auto md:mx-auto lg:mx-0 mb-4 sm:mb-6 px-2 sm:px-0"
            >
              Personalized practice, ruthless feedback, and full-length mock
              tests designed to push you to Band 8.0+.
            </motion.p>
            {/* /// add link to sign up */}
            <motion.div variants={fadeInUp} className="w-full md:w-full lg:w-auto">
              <Link to="/signup" className="block w-full md:block lg:inline-block lg:w-auto">
              <Button
                size="lg"
                className="bg-[#4A90E2] hover:bg-[#3a7ac8d3] text-white px-6 sm:px-8 py-3 sm:py-4 md:py-6 rounded-full font-semibold text-sm 
                sm:text-base w-full md:w-full lg:w-auto group transition-all shadow-[0px_20px_25px_-5px_#2D9CDB4D]"
                >
                Start Free Practice <LuArrowRight className="ml-0 inline transition-transform group-hover:translate-x-2" />
              </Button>
                </Link>
            </motion.div>

            {/* Social Proof */}
            <motion.div 
              variants={fadeIn}
              className="flex flex-col sm:flex-row md:flex-row items-center justify-center md:justify-center lg:justify-start gap-2 sm:gap-2 mt-3 sm:mt-4 md:mt-4 lg:mt-0"
            >
              <div className="flex -space-x-2">
                {[
                  "/images/humans/avatar/загрузка (1).jpg",
                  "/images/humans/avatar/загрузка (8).jpg",
                  "/images/humans/avatar/загрузка (9).jpg",
                  "/images/humans/avatar/загрузка23.jpg",
                ].map((avatar, i) => (
                  <img
                    key={i}
                    src={avatar}
                    alt={`Student ${i + 1}`}
                    className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-white object-cover"
                  />
                ))}
              </div>
              <p className="text-xs sm:text-sm text-gray-600 sm:ml-2 md:ml-2 text-center md:text-center lg:text-left">
                Trusted by students from <span className="font-semibold">planet Earth</span> (maybe Mars someday)
              </p>
            </motion.div>
          </motion.div>

          {/* RIGHT – MY PROGRESS */}
          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="bg-white/95 backdrop-blur rounded-2xl sm:rounded-3xl shadow-[0_25px_60px_rgba(15,23,42,0.12)] p-4 sm:p-5 md:p-6 lg:p-6 xl:p-8 2xl:p-10 
            max-w-full sm:max-w-md md:max-w-md lg:max-w-md xl:max-w-lg 2xl:max-w-2xl w-full mx-auto md:mx-auto lg:mx-0 hover:shadow-[0_30px_70px_rgba(15,23,42,0.18)] transition-shadow duration-300 border border-white/60"
          >
            <div className="flex items-start justify-between mb-4 sm:mb-5 md:mb-6 xl:mb-8">
              <div>
                <h3 className="text-lg sm:text-xl md:text-xl xl:text-2xl 2xl:text-3xl font-semibold text-gray-900">My Progress</h3>
                
              </div>
              <motion.span 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.6, type: "spring" }}
                className="px-2 sm:px-3 md:px-3 xl:px-4 py-1 xl:py-1.5 text-[10px] sm:text-xs md:text-xs xl:text-sm 2xl:text-base font-semibold rounded-full bg-green-100 text-green-600 whitespace-nowrap"
              >
                Active Session
              </motion.span>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:gap-4 mb-4 sm:mb-5 md:mb-6 xl:mb-8">
              {[
                { name: "Listening", score: "8.5", icon: LuHeadphones, color: "text-blue-500", delay: 0.4 },
                { name: "Reading", score: "7.5", icon: LuBookOpen, color: "text-orange-500", delay: 0.5 },
                { name: "Writing", score: "7.0", icon: LuPenTool, color: "text-purple-500", delay: 0.6 },
                { name: "Speaking", score: "8.0", icon: LuMic, color: "text-green-500", delay: 0.7 },
              ].map((s) => (
                <motion.div 
                  key={s.name} 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: s.delay, duration: 0.4 }}
                  whileHover={{ scale: 1.05 }}
                  className="bg-linear-to-br from-white via-[#F7FBFF] to-[#ECF4FF] rounded-2xl sm:rounded-3xl p-3 sm:p-3.5 border border-white/70 shadow-[0_12px_30px_rgba(15,23,42,0.08)] hover:shadow-[0_16px_36px_rgba(15,23,42,0.12)] transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2 sm:gap-2.5 md:gap-2.5 xl:gap-3 mb-2 sm:mb-2.5 md:mb-2.5 xl:mb-3">
                    <span className="w-8 h-8 sm:w-9 sm:h-9 md:w-9 md:h-9 xl:w-10 xl:h-10 2xl:w-12 2xl:h-12 rounded-xl sm:rounded-2xl bg-white/80 shadow-[0_6px_16px_rgba(15,23,42,0.08)] flex items-center justify-center">
                      <s.icon className={`${s.color} text-base sm:text-lg md:text-lg xl:text-xl 2xl:text-2xl`} />
                    </span>
                    <p className="text-[10px] sm:text-xs md:text-xs xl:text-sm 2xl:text-base font-semibold text-gray-500 uppercase tracking-wide">{s.name}</p>
                  </div>
                  <p className="text-xl sm:text-2xl md:text-2xl xl:text-3xl 2xl:text-4xl font-semibold text-gray-900">{s.score}</p>
                </motion.div>
              ))}
            </div>

            <motion.div 
              ref={progressRef}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="bg-blue-50 rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-5 xl:p-6 2xl:p-8 flex items-center justify-between"
            >
              <div>
                <p className="text-[10px] sm:text-xs md:text-xs xl:text-sm 2xl:text-base font-semibold text-gray-500 uppercase">
                  Average Score
                </p>
                <p className="text-xl sm:text-2xl md:text-2xl xl:text-3xl 2xl:text-4xl font-semibold">Band 8.0</p>
              </div>

              {/* <div className="relative w-12 h-12 sm:w-14 sm:h-14 xl:w-16 xl:h-16 2xl:w-20 2xl:h-20">
                <svg className="-rotate-90 w-full h-full" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="16" fill="none" stroke="#E5E7EB" strokeWidth="3" />
                  <motion.circle
                    cx="18"
                    cy="18"
                    r="16"
                    fill="none"
                    stroke="#3B82F6"
                    strokeWidth="3"
                    strokeLinecap="round"
                    initial={{ strokeDasharray: "0 100" }}
                    animate={{ strokeDasharray: `${progress} 100` }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[10px] sm:text-xs xl:text-sm 2xl:text-base font-semibold text-blue-600">
                  {Math.round(progress)}%
                </span>
              </div> */}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ================= TRUSTED BY ================= */}
      <AnimatedSection className="bg-white flex items-center py-10 sm:py-12 md:py-16 lg:py-20 px-4 sm:px-6 md:px-8 lg:px-8">
        <div className="max-w-7xl mx-auto w-full">
          <motion.p 
            variants={fadeInUp}
            className="text-center text-[10px] sm:text-xs font-semibold text-gray-400 uppercase tracking-wider mb-6 sm:mb-8 md:mb-12"
          >
            Trusted by students from
          </motion.p>
          <motion.div 
            variants={staggerContainer}
            className="flex flex-wrap justify-center items-center gap-6 sm:gap-8 md:gap-12 lg:gap-16"
          >
            {["WIUT", "TUIT", "MDIS", "WEBSTER", "TSUL"].map((name) => (
              <motion.span
                key={name}
                variants={fadeInUp}
                whileHover={{ scale: 1.1, color: "#4A90E2" }}
                className="text-xl sm:text-2xl md:text-3xl font-semibold text-gray-400 transition-colors cursor-pointer"
              >
                {name}
              </motion.span>
            ))}
          </motion.div>
        </div>
      </AnimatedSection>

      {/* ================= WHY CHOOSE ================= */}
      <AnimatedSection id="why-choose" className="bg-[#F8FAFC] flex items-center py-10 sm:py-12 md:py-16 lg:py-20 px-4 sm:px-6 md:px-8 lg:px-8">
        <div className="max-w-7xl mx-auto w-full">

          <motion.p 
            variants={fadeInUp}
            className="text-center text-[10px] sm:text-xs font-semibold tracking-widest text-blue-500 uppercase mb-3 sm:mb-4"
          >
            Why choose IELTSCORE?
          </motion.p>

          <motion.h2 
            variants={fadeInUp}
            className="text-center text-2xl sm:text-3xl md:text-3xl lg:text-4xl font-semibold text-gray-900 mb-8 sm:mb-10 md:mb-12 lg:mb-16 px-4"
          >
            Because Band 8 doesn't happen by accident 😉
          </motion.h2>

          <motion.div 
            variants={staggerContainer}
            className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-6 md:gap-8"
          >
            {/* Full Mock Tests */}
            <motion.div 
              variants={scaleIn}
              whileHover={{ y: -8, scale: 1.02 }}
              className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 md:p-8 shadow-sm hover:shadow-xl transition-all duration-300"
            >
              <motion.div 
                whileHover={{ rotate: 5, scale: 1.1 }}
                className="w-12 h-12 sm:w-14 sm:h-14 bg-blue-50 rounded-xl sm:rounded-2xl flex items-center justify-center mb-4 sm:mb-5 md:mb-6"
              >
                <LuFileText className="text-blue-600 text-xl sm:text-2xl" />
              </motion.div>
              <h3 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-3 text-gray-900">Full Mock Tests</h3>
              <p className="text-xs sm:text-sm text-gray-500 leading-relaxed mb-3 sm:mb-4">
                Where weak answers go to die — and Band 8s are born. Built to train your brain and your stamina.
              </p>
            </motion.div>

            {/* AI Evaluation */}
            <motion.div
              variants={scaleIn}
              whileHover={{ y: -8, scale: 1.02 }}
              className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 md:p-8 shadow-sm hover:shadow-xl transition-all duration-300"
            >
              <motion.div 
                whileHover={{ rotate: 5, scale: 1.1 }}
                className="w-12 h-12 sm:w-14 sm:h-14 bg-green-50 rounded-xl sm:rounded-2xl flex items-center justify-center mb-4 sm:mb-5 md:mb-6"
              >
                <LuMic className="text-green-600 text-xl sm:text-2xl" />
              </motion.div>
              <h3 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-3 text-gray-900">AI Evaluation</h3>
              <p className="text-xs sm:text-sm text-gray-500 leading-relaxed mb-3 sm:mb-4">
                Honest feedback. Zero sugarcoating. Get instant, detailed scores based on official IELTS criteria.
              </p>
            </motion.div>

            {/* Score Predictor */}
            <motion.div 
              variants={scaleIn}
              whileHover={{ y: -8, scale: 1.02 }}
              className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 md:p-8 shadow-sm hover:shadow-xl transition-all duration-300 md:col-span-2 lg:col-span-1"
            >
              <motion.div 
                whileHover={{ rotate: 5, scale: 1.1 }}
                className="w-12 h-12 sm:w-14 sm:h-14 bg-purple-50 rounded-xl sm:rounded-2xl flex items-center justify-center mb-4 sm:mb-5 md:mb-6"
              >
                <LuTrendingUp className="text-purple-600 text-xl sm:text-2xl" />
              </motion.div>
              <h3 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-3 text-gray-900">Score Predictor</h3>
              <p className="text-xs sm:text-sm text-gray-500 leading-relaxed mb-3 sm:mb-4">
                Because "I think I got a 7" isn't a strategy. Your daily practice and see realistic band score predictions that update as you improve.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </AnimatedSection>

      {/* ================= OUR IMPACT ================= */}
      {/* <AnimatedSection id="our-impact" className="relative py-12 sm:py-16 lg:py-20 bg-gradient-to-br from-[#0A3D4A] to-[#0D5266] overflow-hidden">
        <div 
          className="absolute top-1/2 left-[37.5%] md:left-[37.5%] w-48 h-48 sm:w-64 sm:h-64 md:w-80 md:h-80 rounded-full pointer-events-none -translate-x-1/2 -translate-y-1/2"
          style={{
            background: 'radial-gradient(circle, rgba(96, 165, 250, 0.5) 0%, rgba(59, 130, 246, 0.3) 50%, transparent 70%)',
            filter: 'blur(50px)',
          }}
        />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.p 
            variants={fadeInUp}
            className="text-center text-[10px] sm:text-xs font-semibold tracking-widest text-blue-400 uppercase mb-8 sm:mb-12"
          >
            Our Impact
          </motion.p>

          <motion.div
            variants={staggerContainer}
            className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 text-center text-white"
          >
            {[
              { value: "1000+", label: "Band 8.0 Achievers" },
              { value: "10+", label: "Expert Tutors" },
              { value: "1,000+", label: "Practice Lessons" },
              { value: "4.9/5", label: "Student Satisfaction" },
            ].map((stat, index) => (
              <motion.div
                key={index}
                variants={fadeInUp}
                whileHover={{ scale: 1.1 }}
                className="cursor-default"
              >
                <h3 className="text-3xl sm:text-4xl md:text-5xl font-semibold mb-1 sm:mb-2">
                  {stat.value.includes("/") ? (
                    stat.value
                  ) : (
                    <AnimatedCounter value={stat.value} suffix={stat.value.includes("+") ? "+" : ""} />
                  )}
                </h3>
                <p className="text-xs sm:text-sm text-blue-200">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </AnimatedSection> */}

      {/* ================= SUCCESS STORIES ================= */}
      <AnimatedSection id="stories" className="bg-white flex items-center py-10 sm:py-12 md:py-16 lg:py-20 px-4 sm:px-6 md:px-8 lg:px-8">
        <div className="max-w-7xl mx-auto w-full">
          <motion.p 
            variants={fadeInUp}
            className="text-center text-[10px] sm:text-xs font-semibold tracking-widest text-blue-500 uppercase mb-3 sm:mb-4"
          >
            Success Stories
          </motion.p>
          <motion.h2 
            variants={fadeInUp}
            className="text-center text-2xl sm:text-3xl md:text-3xl lg:text-4xl font-semibold text-gray-900 mb-8 sm:mb-10 md:mb-12 lg:mb-16 px-4"
          >
            People like you. Scores they're proud of.
          </motion.h2>

          <div className="overflow-hidden -mx-4 sm:-mx-6 md:-mx-8 lg:-mx-8 py-4">
            <div className="flex gap-4 sm:gap-6 md:gap-8 animate-marquee">
              {/* Первый набор всех карточек */}
              {TESTIMONIALS_MOCK.map((t, i) => (
                <div
                  key={`first-${i}`}
                  className="shrink-0 w-[280px] sm:w-[300px] md:w-[320px] lg:w-[360px]"
                >
                  <div className="bg-white border border-gray-200 rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                    <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                      <img
                        src={t.avatar}
                        alt={t.name}
                        className="w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 rounded-full shrink-0 object-cover"
                      />
                      <div>
                        <h4 className="text-sm sm:text-base font-semibold text-gray-900">{t.name}</h4>
                        <p className="text-[10px] sm:text-xs text-gray-500">{t.subtitle}</p>
                      </div>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4 leading-relaxed">
                      "{t.quote}"
                    </p>
                    <div className="flex items-center gap-2 text-green-600">
                      <motion.span
                        animate={{ rotate: [0, 10, -10, 0] }}
                        transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                        className="text-lg sm:text-xl"
                      >
                        {t.emoji}
                      </motion.span>
                      <span className="text-[10px] sm:text-xs font-semibold">{t.result}</span>
                    </div>
                  </div>
                </div>
              ))}
              {/* Дублированный набор для бесконечного цикла */}
              {TESTIMONIALS_MOCK.map((t, i) => (
                <div
                  key={`second-${i}`}
                  className="shrink-0 w-[280px] sm:w-[300px] md:w-[320px] lg:w-[360px]"
                >
                  <div className="bg-white border border-gray-200 rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                    <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                      <img
                        src={t.avatar}
                        alt={t.name}
                        className="w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 rounded-full shrink-0 object-cover"
                      />
                      <div>
                        <h4 className="text-sm sm:text-base font-semibold text-gray-900">{t.name}</h4>
                        <p className="text-[10px] sm:text-xs text-gray-500">{t.subtitle}</p>
                      </div>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4 leading-relaxed">
                      "{t.quote}"
                    </p>
                    <div className="flex items-center gap-2 text-green-600">
                      <motion.span
                        animate={{ rotate: [0, 10, -10, 0] }}
                        transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                        className="text-lg sm:text-xl"
                      >
                        {t.emoji}
                      </motion.span>
                      <span className="text-[10px] sm:text-xs font-semibold">{t.result}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </AnimatedSection>

      {/* ================= CTA ================= */}
      <AnimatedSection className="relative py-12 sm:py-16 md:py-20 lg:py-24 xl:py-32 bg-[#082C36] text-center px-4 sm:px-6 md:px-8 lg:px-8 rounded-2xl sm:rounded-3xl mx-2 sm:mx-4 md:mx-4 my-4 sm:my-6 md:my-8 overflow-hidden">
        {/* Blur элемент - нижний левый угол */}
        <div 
          className="absolute bottom-0 left-0 w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 rounded-full -translate-x-1/4 translate-y-1/4 pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(96, 165, 250, 0.6) 0%, rgba(59, 130, 246, 0.4) 50%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />
        
        {/* Blur элемент - верхний правый угол */}
        <div 
          className="absolute top-0 right-0 w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 rounded-full translate-x-1/4 -translate-y-1/4 pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(94, 234, 212, 0.6) 0%, rgba(20, 184, 166, 0.4) 50%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />
        
        <div className="max-w-4xl mx-auto relative z-10">
          <motion.p 
            variants={fadeInUp}
            className="text-[10px] sm:text-xs font-semibold tracking-widest text-blue-300 uppercase mb-3 sm:mb-4"
          >
            Ready to start?
          </motion.p>
          <motion.h2 
            variants={fadeInUp}
            className="text-2xl sm:text-3xl md:text-3xl lg:text-4xl xl:text-5xl font-semibold text-white mb-4 sm:mb-5 md:mb-6 leading-tight px-2"
          >
            Ready to finally get the band score you <span className="italic">actually</span> want?
          </motion.h2>
          <motion.p 
            variants={fadeInUp}
            className="text-blue-100 text-xs sm:text-sm mb-6 sm:mb-7 md:mb-8 max-w-2xl mx-auto px-2 text-center"
          >
            Join 1,000+ students who turned IELTS stress into confidence with IELTSCORE
          </motion.p>
          <motion.div variants={fadeInUp} className="w-full md:w-full lg:w-auto">
            <Link to="/signup" className="block w-full md:block lg:inline-block lg:w-auto">
                <Button
              size="lg"
              className="bg-[#4A90E2] hover:bg-[#3A7BC8] text-white px-6 sm:px-8 py-2.5 sm:py-3 md:py-3 rounded-full font-semibold transition-all text-sm sm:text-base w-full md:w-full lg:w-auto group shadow-[0_4px_20px_rgba(74,144,226,0.4)]"
            >
              Get Started Now <LuArrowRight className="ml-2 inline transition-transform group-hover:translate-x-1" />
            </Button>
            </Link>
          </motion.div>
        </div>
      </AnimatedSection>
    </div>
  );
};
export default LandingPage;
