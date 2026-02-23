import { MdInsights } from "react-icons/md";
import { motion } from "framer-motion";
import { HiArrowLeft } from "react-icons/hi2";
import { useNavigate, useSearchParams } from "react-router-dom";

const isMockTestRoute = (path) =>
  path?.startsWith("/mock-test") ||
  path?.startsWith("/mock-tests") ||
  path?.startsWith("/mock/") ||
  path === "/mock";

const AnimatedPolygonDecoration = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const isMockTestMode = (() => {
    const redirectPath = searchParams.get("redirect");
    if (redirectPath) {
      const pathname = redirectPath.split("?")[0];
      if (isMockTestRoute(pathname)) return true;
    }
    return typeof sessionStorage !== "undefined" && sessionStorage.getItem("accessMode") === "mockTest";
  })();
  // Animation variants for the main hexagon
  const polygramshape = {
    clipPath: "polygon(50% 0%, 90% 20%, 100% 60%, 75% 100%, 25% 100%, 0% 60%, 10% 20%)",
    background: "linear-gradient(135deg, rgba(19, 109, 236, 0.4) 0%, rgba(19, 109, 236, 0.1) 100%)",
    border: "2px solid rgba(19, 109, 236, 0.6)",
    backdropFilter: "blur(4px)",
  };

  const glowpoint = {
    width: "8px",
    height: "8px",
    background: "#136dec",
    borderRadius: "50%",
    boxShadow: "0 0 15px #136dec, 0 0 30px #136dec",
    position: "absolute",
  };
  return (
    <div className="hidden lg:flex w-1/2 bg-[#0a192f] relative flex-col items-center justify-between overflow-hidden p-12">
      {/* <!-- Background Decoration - Back button hidden in mock test flow --> */}
      {!isMockTestMode && (
        <motion.button
          onClick={() => navigate("/")}
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          whileHover={{ x: -5 }}
          className="absolute top-8 left-8 z-50 flex items-center space-x-2 text-blue-200/70 hover:text-white transition-colors group"
        >
          <div className="p-2 rounded-full bg-white/5 border border-white/10 group-hover:bg-[#136dec]/20 group-hover:border-[#136dec]/50 transition-all">
            <HiArrowLeft className="text-xl" />
          </div>
          <span className="text-sm font-medium tracking-wide uppercase">Back</span>
        </motion.button>
      )}

      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-[#136dec] blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-400 blur-[120px]"></div>
      </div>
      {/* <!-- 3D Polygram Illustration --> */}
      <div className="relative z-10 flex flex-col items-center text-center h-full justify-evenly">
        <div className="polygram-container mb-12 flex items-center justify-center relative w-[250px] h-[250px]">
          {/* <!-- Abstract Radar/Polygram Shape --> */}
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="absolute inset-0 bg-[#136dec]/25"
              style={polygramshape}
              initial={{ scale: 1, opacity: 0 }} 
              animate={{
                scale: [1, 2],        
                opacity: [0, 0.4, 0], 
              }}
              transition={{
                duration: 4,          
                repeat: Infinity,
                delay: i * 1.33,      
                ease: "linear",       
              }}
            />
          ))}

          <div
            className="absolute inset-10 bg-[#136dec] opacity-80 shadow-lg shadow-[#136dec]/50"
            style={polygramshape}
          ></div>
          <div className="glow-point top-0 left-1/2 -translate-x-1/2" style={glowpoint} ></div>
          <div className="glow-point top-1/4 right-0" style={glowpoint} ></div>
          <div className="glow-point bottom-1/4 right-0" style={glowpoint} ></div>
          <div className="glow-point bottom-0 left-1/2 -translate-x-1/2" style={glowpoint} ></div>
          <div className="glow-point bottom-1/4 left-0" style={glowpoint} ></div>
          <div className="glow-point top-1/4 left-0" style={glowpoint} ></div>
          {/* <!-- Center Core --> */}
          <div className="w-16 h-16 rounded-full bg-[#136dec]/40 backdrop-blur-xl border border-white/20 flex items-center justify-center">
            <MdInsights className="text-white text-3xl" />
          </div>
        </div>
        <div>
        <h2 className="text-4xl font-bold text-white mb-4 tracking-tight mt-16">Master Your Core Skills</h2>
        <p className="text-blue-200/70 text-lg max-w-md leading-relaxed">
          Advanced analytics and personalized paths to help you achieve your target IELTS score with confidence.
        </p>
        </div>
      </div>
      {/* <!-- Footer Quote/Trust --> */}
      <div className="absolute bottom-12 left-12 right-12 z-10 flex items-center space-x-4 border-t border-white/10 pt-8">
        <div className="flex -space-x-2">
          <img className="w-10 h-10 rounded-full border-2 border-[#0a192f] object-cover" data-alt="User avatar 1" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCngA7atqsY0quZqeb90UDaOPCc4bj8wsIiyWc1VKJUNmBfjSyN_CdJndcuVKlbKMEdPMIRWUZYrqBJt-_x8Tvb-F48TZan2pPD02v4Y5n-BeyTxzmsQbQ_o8j4BXlRm7-dZZe_4dyPYc0JNBip6tL5TDTznpr67SRztx8tlantYh5MlKCdLMlkAIlWEodUVbLwmWVgaW16vPlw6LZC434c2rrvosJiRR6vY5QbMO44QxMdPEzW853LyeHQSMsmnIR2FB619B-5AgE" />
          <img className="w-10 h-10 rounded-full border-2 border-[#0a192f] object-cover" data-alt="User avatar 2" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBk6YHLz02zeC9OvwuzLN3af3_DRYktBhRX0faFBhE5W18krcX7sjpmxBQ246JZ9o0MPhjKGuDvMGIor08a1SGq_gLg4EXhk07DraAldj8wkQOCxHP-4TkxQ2r-PNhM_S7gaYf6b5mb2_IISnWBGcDH0SpcuGp7moB1-gK7e_Ea7oFVyRvfD7MMYfAxKGDzVrm6MzwwW5AkM8p5qGR6uahYHghiwYHJXDWJlp3bYzoA2gbmOuMNPJxE5Qbnbc1mXVQDuHByQNLYJRE" />
          <img className="w-10 h-10 rounded-full border-2 border-[#0a192f] object-cover" data-alt="User avatar 3" src="https://lh3.googleusercontent.com/aida-public/AB6AXuC0sEgoxApKfBkl7FoPNIRDItpEC5fswX7qbZWXpQDAY7ihq7fDc2CcuJXVj9b-0hddzBgyEL5AuDPv6j-yrcIBDBAi_G1hZq2RYWUI2ZdlgD7NpBrJovtqX-IJPg5STRx2HUDGd2u7GULf2y7SVQeFBpm1y_8vDq1zHDQhpjSz18EYfSwP2eJOf7RFdCNGAO5-h-Bd-29grZlIYYIKc6PMMgw4QV2zEpPvq6rH_6CJ7s-b_VY7XgFG_ceKlzv3PoiMVhseUjOJ1Y0" />
        </div>
        <p className="text-blue-100/50 text-sm">Joined by 20,000+ students worldwide</p>
      </div>
    </div>
  );
};

export default AnimatedPolygonDecoration;

