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
    <div className="min-h-screen">

      {/* ================= HERO ================= */}
      <section className="min-h-[90vh] sm:min-h-screen bg-gradient-to-br from-[#F8FAFC] via-[#F0F7FF] to-[#EEF5FF] flex items-center py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-10 lg:gap-12 items-center w-full">

          {/* LEFT */}
          <motion.div 
            className="space-y-6 sm:space-y-8 text-center lg:text-left"
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
                NEW: AI SPEAKING MOCK TESTS
              </span>
            </motion.div>

            <motion.h1 
              variants={fadeInUp}
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold text-gray-900 leading-tight"
            >
              Build Skills,<br />
              Boost Scores,<br />
              Master <span className="text-[#4A90E2]">IELTS</span>.
            </motion.h1>

            <motion.p 
              variants={fadeInUp}
              className="text-base sm:text-lg lg:text-xl text-gray-600 max-w-xl mx-auto lg:mx-0"
            >
              Personalized practice, ruthless feedback, and full-length mock
              tests designed to push you to Band 8.0+.
            </motion.p>

            <motion.div variants={fadeInUp}>
              <Button
                size="lg"
                className="bg-[#4A90E2] hover:bg-[#3A7BC8] text-white px-6 sm:px-8 py-4 sm:py-6 rounded-xl font-semibold text-sm sm:text-base w-full sm:w-auto group transition-all hover:scale-105 hover:shadow-lg"
              >
                Start Free Practice <LuArrowRight className="ml-2 inline transition-transform group-hover:translate-x-1" />
              </Button>
            </motion.div>

            {/* Social Proof */}
            <motion.div 
              variants={fadeIn}
              className="flex items-center justify-center lg:justify-start gap-2 pt-4"
            >
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 border-2 border-white flex items-center justify-center text-white text-xs font-semibold"
                  >
                    {String.fromCharCode(64 + i)}
                  </div>
                ))}
              </div>
              <p className="text-xs sm:text-sm text-gray-600 ml-2">
                Trusted by students from <span className="font-semibold">planet Earth</span> (maybe Mars someday)
              </p>
            </motion.div>
          </motion.div>

          {/* RIGHT – MY PROGRESS */}
          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="bg-white rounded-2xl sm:rounded-3xl shadow-xl p-4 sm:p-6 max-w-md w-full mx-auto lg:mx-0 hover:shadow-2xl transition-shadow duration-300"
          >
            <div className="flex items-start justify-between mb-4 sm:mb-6">
              <div>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900">My Progress</h3>
                <p className="text-[10px] sm:text-xs text-gray-500 mt-1">
                  Last updated: Today, 10:30 AM
                </p>
              </div>
              <motion.span 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.6, type: "spring" }}
                className="px-2 sm:px-3 py-1 text-[10px] sm:text-xs font-semibold rounded-full bg-green-100 text-green-600 whitespace-nowrap"
              >
                Active Session
              </motion.span>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
              {[
                { name: "Listening", score: 8.5, icon: LuHeadphones, color: "text-blue-500", delay: 0.4 },
                { name: "Reading", score: 7.5, icon: LuBookOpen, color: "text-orange-500", delay: 0.5 },
                { name: "Writing", score: 7.0, icon: LuPenTool, color: "text-purple-500", delay: 0.6 },
                { name: "Speaking", score: 8.0, icon: LuMic, color: "text-green-500", delay: 0.7 },
              ].map((s) => (
                <motion.div 
                  key={s.name} 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: s.delay, duration: 0.4 }}
                  whileHover={{ scale: 1.05 }}
                  className="bg-gray-50 rounded-xl sm:rounded-2xl p-3 sm:p-4 border hover:border-blue-300 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                    <s.icon className={`${s.color} text-base sm:text-lg`} />
                    <p className="text-[10px] sm:text-xs font-semibold text-gray-500">{s.name}</p>
                  </div>
                  <p className="text-xl sm:text-2xl font-semibold">{s.score}</p>
                </motion.div>
              ))}
            </div>

            <motion.div 
              ref={progressRef}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="bg-blue-50 rounded-xl sm:rounded-2xl p-4 sm:p-5 flex items-center justify-between"
            >
              <div>
                <p className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase">
                  Target Score
                </p>
                <p className="text-xl sm:text-2xl font-semibold">Band 8.5</p>
              </div>

              <div className="relative w-12 h-12 sm:w-14 sm:h-14">
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
                <span className="absolute inset-0 flex items-center justify-center text-[10px] sm:text-xs font-semibold text-blue-600">
                  {Math.round(progress)}%
                </span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ================= TRUSTED BY ================= */}
      <AnimatedSection className="bg-white flex items-center py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto w-full">
          <motion.p 
            variants={fadeInUp}
            className="text-center text-[10px] sm:text-xs font-semibold text-gray-400 uppercase tracking-wider mb-8 sm:mb-12"
          >
            Trusted by students from
          </motion.p>
          <motion.div 
            variants={staggerContainer}
            className="flex flex-wrap justify-center items-center gap-8 sm:gap-12 lg:gap-16"
          >
            {["WIUT", "TUIT", "MDIS", "WEBSTER", "TSUL"].map((name, index) => (
              <motion.span
                key={name}
                variants={fadeInUp}
                whileHover={{ scale: 1.1, color: "#4A90E2" }}
                className="text-2xl sm:text-3xl font-semibold text-gray-400 transition-colors cursor-pointer"
              >
                {name}
              </motion.span>
            ))}
          </motion.div>
        </div>
      </AnimatedSection>

      {/* ================= WHY CHOOSE ================= */}
      <AnimatedSection id="why-choose" className="bg-[#F8FAFC] flex items-center py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto w-full">

          <motion.p 
            variants={fadeInUp}
            className="text-center text-[10px] sm:text-xs font-semibold tracking-widest text-blue-500 uppercase mb-3 sm:mb-4"
          >
            Why choose IELTS SIM?
          </motion.p>

          <motion.h2 
            variants={fadeInUp}
            className="text-center text-2xl sm:text-3xl lg:text-4xl font-semibold text-gray-900 mb-10 sm:mb-12 lg:mb-16 px-4"
          >
            Because Band 8 doesn't happen by accident 😉
          </motion.h2>

          <motion.div 
            variants={staggerContainer}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8"
          >
            {/* Full Mock Tests */}
            <motion.div 
              variants={scaleIn}
              whileHover={{ y: -8, scale: 1.02 }}
              className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-sm hover:shadow-xl transition-all duration-300"
            >
              <motion.div 
                whileHover={{ rotate: 5, scale: 1.1 }}
                className="w-12 h-12 sm:w-14 sm:h-14 bg-blue-50 rounded-xl sm:rounded-2xl flex items-center justify-center mb-4 sm:mb-6"
              >
                <LuFileText className="text-blue-600 text-xl sm:text-2xl" />
              </motion.div>
              <h3 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-3 text-gray-900">Full Mock Tests</h3>
              <p className="text-xs sm:text-sm text-gray-500 leading-relaxed mb-3 sm:mb-4">
                Where weak answers go to die — and Band 8s are born. Built to train your brain and your stamina.
              </p>
              <button className="text-blue-600 text-xs sm:text-sm font-semibold hover:underline flex items-center gap-1 group">
                Learn more <LuArrowRight className="text-xs transition-transform group-hover:translate-x-1" />
              </button>
            </motion.div>

            {/* AI Evaluation */}
            <motion.div 
              variants={scaleIn}
              whileHover={{ y: -8, scale: 1.02 }}
              className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-sm hover:shadow-xl transition-all duration-300"
            >
              <motion.div 
                whileHover={{ rotate: 5, scale: 1.1 }}
                className="w-12 h-12 sm:w-14 sm:h-14 bg-green-50 rounded-xl sm:rounded-2xl flex items-center justify-center mb-4 sm:mb-6"
              >
                <LuMic className="text-green-600 text-xl sm:text-2xl" />
              </motion.div>
              <h3 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-3 text-gray-900">AI Evaluation</h3>
              <p className="text-xs sm:text-sm text-gray-500 leading-relaxed mb-3 sm:mb-4">
                Honest feedback. Zero sugarcoating. Get instant, detailed Writing & Speaking scores based on official IELTS criteria.
              </p>
              <button className="text-blue-600 text-xs sm:text-sm font-semibold hover:underline flex items-center gap-1 group">
                Try AI Engine <LuArrowRight className="text-xs transition-transform group-hover:translate-x-1" />
              </button>
            </motion.div>

            {/* Score Predictor */}
            <motion.div 
              variants={scaleIn}
              whileHover={{ y: -8, scale: 1.02 }}
              className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-sm hover:shadow-xl transition-all duration-300 md:col-span-2 lg:col-span-1"
            >
              <motion.div 
                whileHover={{ rotate: 5, scale: 1.1 }}
                className="w-12 h-12 sm:w-14 sm:h-14 bg-purple-50 rounded-xl sm:rounded-2xl flex items-center justify-center mb-4 sm:mb-6"
              >
                <LuTrendingUp className="text-purple-600 text-xl sm:text-2xl" />
              </motion.div>
              <h3 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-3 text-gray-900">Score Predictor</h3>
              <p className="text-xs sm:text-sm text-gray-500 leading-relaxed mb-3 sm:mb-4">
                Because "I think I got a 7" isn't a strategy. Your daily practice and see realistic band score predictions that update as you improve.
              </p>
              <button className="text-blue-600 text-xs sm:text-sm font-semibold hover:underline flex items-center gap-1 group">
                See my score <LuArrowRight className="text-xs transition-transform group-hover:translate-x-1" />
              </button>
            </motion.div>
          </motion.div>
        </div>
      </AnimatedSection>

      {/* ================= OUR IMPACT ================= */}
      <AnimatedSection id="our-impact" className="py-12 sm:py-16 lg:py-20 bg-gradient-to-br from-[#0A3D4A] to-[#0D5266]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
      </AnimatedSection>

      {/* ================= SUCCESS STORIES ================= */}
      <AnimatedSection id="stories" className="bg-white flex items-center py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto w-full">
          <motion.p 
            variants={fadeInUp}
            className="text-center text-[10px] sm:text-xs font-semibold tracking-widest text-blue-500 uppercase mb-3 sm:mb-4"
          >
            Success Stories
          </motion.p>
          <motion.h2 
            variants={fadeInUp}
            className="text-center text-2xl sm:text-3xl lg:text-4xl font-semibold text-gray-900 mb-10 sm:mb-12 lg:mb-16 px-4"
          >
            People like you. Scores they're proud of.
          </motion.h2>

         
          <div 
            variants={staggerContainer}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8"
          >
            {/* Testimonial 1 */}
            <motion.div 
              variants={scaleIn}
              whileHover={{ y: -5, scale: 1.02 }}
              className="bg-white border border-gray-200 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm hover:shadow-xl transition-all duration-300"
            >
              <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                <motion.div 
                  whileHover={{ scale: 1.1 }}
                  className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full shrink-0"
                ></motion.div>
                <div>
                  <h4 className="text-sm sm:text-base font-semibold text-gray-900">Dilshodbek R.</h4>
                  <p className="text-[10px] sm:text-xs text-gray-500">WIUT Student</p>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4 leading-relaxed">
                "The analytics provided by IELTS SIM were eye-opening. I finally understood why my Writing score was stuck at 6.0 and managed to push it to 7.5 in just 3 weeks."
              </p>
              <div className="flex items-center gap-2 text-green-600">
                <motion.span 
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                  className="text-lg sm:text-xl"
                >
                  📈
                </motion.span>
                <span className="text-[10px] sm:text-xs font-semibold">Improved from 6.0 to 7.5</span>
              </div>
            </motion.div>

            {/* Testimonial 2 */}
            <motion.div 
              variants={scaleIn}
              whileHover={{ y: -5, scale: 1.02 }}
              className="bg-white border border-gray-200 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm hover:shadow-xl transition-all duration-300"
            >
              <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                <motion.div 
                  whileHover={{ scale: 1.1 }}
                  className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-full shrink-0"
                ></motion.div>
                <div>
                  <h4 className="text-sm sm:text-base font-semibold text-gray-900">Sarah Jenkins</h4>
                  <p className="text-[10px] sm:text-xs text-gray-500">International Student</p>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4 leading-relaxed">
                "Highly realistic interface. On the actual test day, I felt completely at home because the SIM environment was identical. Achieved a Band 8.5 overall!"
              </p>
              <div className="flex items-center gap-2 text-green-600">
                <motion.span 
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                  className="text-lg sm:text-xl"
                >
                  🎯
                </motion.span>
                <span className="text-[10px] sm:text-xs font-semibold">Achieved Band 8.5</span>
              </div>
            </motion.div>

            {/* Testimonial 3 */}
            <motion.div 
              variants={scaleIn}
              whileHover={{ y: -5, scale: 1.02 }}
              className="bg-white border border-gray-200 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm hover:shadow-xl transition-all duration-300"
            >
              <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                <motion.div 
                  whileHover={{ scale: 1.1 }}
                  className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full shrink-0"
                ></motion.div>
                <div>
                  <h4 className="text-sm sm:text-base font-semibold text-gray-900">Azamat K.</h4>
                  <p className="text-[10px] sm:text-xs text-gray-500">TUIT Tech Graduate</p>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4 leading-relaxed">
                "I used to struggle with the Speaking section. The feedback provided on the SIM was practical and directly applicable. I jumped from 6.5 to 8.0."
              </p>
              <div className="flex items-center gap-2 text-green-600">
                <motion.span 
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                  className="text-lg sm:text-xl"
                >
                  🚀
                </motion.span>
                <span className="text-[10px] sm:text-xs font-semibold">Improved from 6.5 to 8.0</span>
              </div>
            </motion.div>

            {/* Testimonial 4 */}
            <motion.div 
              variants={scaleIn}
              whileHover={{ y: -5, scale: 1.02 }}
              className="bg-white border border-gray-200 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm hover:shadow-xl transition-all duration-300"
            >
              <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                <motion.div 
                  whileHover={{ scale: 1.1 }}
                  className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full shrink-0"
                ></motion.div>
                <div>
                  <h4 className="text-sm sm:text-base font-semibold text-gray-900">Sarah Jenkins</h4>
                  <p className="text-[10px] sm:text-xs text-gray-500">International Student</p>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4 leading-relaxed">
                "Highly realistic interface. On the actual test day, I felt completely at home because the SIM environment was identical. Achieved a Band 8.5 overall!"
              </p>
              <div className="flex items-center gap-2 text-green-600">
                <motion.span 
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                  className="text-lg sm:text-xl"
                >
                  📊
                </motion.span>
                <span className="text-[10px] sm:text-xs font-semibold">Achieved Band 8.5</span>
              </div>
            </motion.div>

            {/* Testimonial 5 */}
            <motion.div 
              variants={scaleIn}
              whileHover={{ y: -5, scale: 1.02 }}
              className="bg-white border border-gray-200 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm hover:shadow-xl transition-all duration-300"
            >
              <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                <motion.div 
                  whileHover={{ scale: 1.1 }}
                  className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-pink-400 to-pink-600 rounded-full shrink-0"
                ></motion.div>
                <div>
                  <h4 className="text-sm sm:text-base font-semibold text-gray-900">Azamat K.</h4>
                  <p className="text-[10px] sm:text-xs text-gray-500">MDIS Tech Teacher</p>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4 leading-relaxed">
                "I used to struggle with the Speaking section. The feedback provided on the SIM was practical and directly applicable. I jumped from 6.5 to 8.0."
              </p>
              <div className="flex items-center gap-2 text-green-600">
                <motion.span 
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                  className="text-lg sm:text-xl"
                >
                  💪
                </motion.span>
                <span className="text-[10px] sm:text-xs font-semibold">Improved from 6.5 to 8.0</span>
              </div>
            </motion.div>

            {/* Testimonial 6 */}
            <motion.div 
              variants={scaleIn}
              whileHover={{ y: -5, scale: 1.02 }}
              className="bg-white border border-gray-200 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm hover:shadow-xl transition-all duration-300"
            >
              <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                <motion.div 
                  whileHover={{ scale: 1.1 }}
                  className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full shrink-0"
                ></motion.div>
                <div>
                  <h4 className="text-sm sm:text-base font-semibold text-gray-900">Dilshodbek R.</h4>
                  <p className="text-[10px] sm:text-xs text-gray-500">WIUT Student</p>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4 leading-relaxed">
                "The analytics provided by IELTS SIM were eye-opening. I finally understood why my Writing score was stuck at 6.0 and managed to push it to 7.5 in just 3 weeks."
              </p>
              <div className="flex items-center gap-2 text-green-600">
                <motion.span 
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                  className="text-lg sm:text-xl"
                >
                  ⭐
                </motion.span>
                <span className="text-[10px] sm:text-xs font-semibold">Improved from 6.0 to 7.5</span>
              </div>
            </motion.div>
          </div>

          <motion.div 
            variants={fadeInUp}
            className="text-center mt-8 sm:mt-12"
          >
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="text-blue-600 font-semibold text-xs sm:text-sm hover:underline flex items-center gap-2 mx-auto group"
            >
              View more <LuArrowRight className="text-xs transition-transform group-hover:translate-x-1" />
            </motion.button>
          </motion.div>
        </div>
      </AnimatedSection>

      {/* ================= CTA ================= */}
      <AnimatedSection className="py-16 sm:py-24 lg:py-32 bg-[#082C36] text-center px-4 sm:px-6 lg:px-8 rounded-2xl sm:rounded-3xl mx-2 sm:mx-4 my-6 sm:my-8">
        <div className="max-w-4xl mx-auto">
          <motion.p 
            variants={fadeInUp}
            className="text-[10px] sm:text-xs font-semibold tracking-widest text-blue-300 uppercase mb-3 sm:mb-4"
          >
            Ready to start?
          </motion.p>
          <motion.h2 
            variants={fadeInUp}
            className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-semibold text-white mb-4 sm:mb-6 leading-tight px-2"
          >
            Ready to finally get the band score you <span className="italic">actually</span> want?
          </motion.h2>
          <motion.p 
            variants={fadeInUp}
            className="text-blue-100 text-xs sm:text-sm mb-6 sm:mb-8 max-w-2xl mx-auto px-2"
          >
            Join 1,000+ students who turned IELTS stress into confidence with IELTS SIM
          </motion.p>
          <motion.div variants={fadeInUp}>
            <Button
              size="lg"
              className="bg-[#4A90E2] hover:bg-[#3A7BC8] text-white px-6 sm:px-8 py-2.5 sm:py-3 rounded-lg font-semibold shadow-lg transition-all text-sm sm:text-base w-full sm:w-auto group"
            >
              Get Started Now <LuArrowRight className="ml-2 inline transition-transform group-hover:translate-x-1" />
            </Button>
          </motion.div>
        </div>
      </AnimatedSection>
    </div>
  );
};

export default LandingPage;