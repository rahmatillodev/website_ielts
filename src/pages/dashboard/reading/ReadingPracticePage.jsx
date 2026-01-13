import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  FaArrowLeft,
  FaExpand,
  FaBars,
  FaEdit,
  FaCheck,
  FaCompress,
} from "react-icons/fa";
import { LuChevronsLeftRight } from "react-icons/lu";
import FinishModal from "@/components/modal/FinishModal";

const ReadingPracticePage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [currentPart, setCurrentPart] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [timeRemaining, setTimeRemaining] = useState(20 * 60);
  const [isStarted, setIsStarted] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [answers, setAnswers] = useState({});
  const [isFullscreen, setIsFullscreen] = useState(false);
  const questionsPerPage = 4;

  const questionRefs = useRef({});
  const questionsContainerRef = useRef(null);
  const [activeQuestion, setActiveQuestion] = useState(null);

  const [leftWidth, setLeftWidth] = useState(50);
  const containerRef = useRef(null);
  const isResizing = useRef(false);

  const startResize = (e) => {
    isResizing.current = true;
  };

  const stopResize = () => {
    isResizing.current = false;
  };

  const handleResize = (e) => {
    if (!isResizing.current || !containerRef.current) return;
    const containerWidth = containerRef.current.offsetWidth;
    const newLeftWidth = (e.clientX / containerWidth) * 100;
    if (newLeftWidth > 20 && newLeftWidth < 80) {
      setLeftWidth(newLeftWidth);
    }
  };

  useEffect(() => {
    window.addEventListener("mousemove", handleResize);
    window.addEventListener("mouseup", stopResize);
    return () => {
      window.removeEventListener("mousemove", handleResize);
      window.removeEventListener("mouseup", stopResize);
    };
  }, []);

  const currentPartData = mockReadingData.parts[currentPart - 1];

  const scrollToQuestion = (id) => {
    const el = questionRefs.current[id];
    if (!el || !questionsContainerRef.current) return;

    const container = questionsContainerRef.current;

    container.scrollTo({
      top: el.offsetTop - container.offsetTop,
      behavior: "smooth",
    });

    setActiveQuestion(id); // manual focus
  };

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.error("Fullscreen error:", err);
    }
  };
  useEffect(() => {
    const handleChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleChange);
    return () => document.removeEventListener("fullscreenchange", handleChange);
  }, []);

  // Timer effect
  useEffect(() => {
    if (!isStarted) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setIsStarted(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isStarted]);

  useEffect(() => {
    if (!questionsContainerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveQuestion(Number(entry.target.dataset.id));
          }
        });
      },
      {
        root: questionsContainerRef.current,
        threshold: 0.6,
      }
    );

    // Object.values(questionRefs.current).forEach((el) => {
    //   if (el) observer.observe(el)
    // })

    return () => observer.disconnect();
  }, [currentPart]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const handleAnswerChange = (questionId, answer) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: answer,
    }));
  };

  const handleStart = () => {
    setIsStarted(true);
  };

  const handlePartChange = (partId) => {
    setCurrentPart(partId);
    setCurrentPage(1); // Reset to first page when switching parts
  };

  // Reset to page 1 when part changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [currentPart]);

  const currentQuestions =
    currentPartData?.questions.slice(
      (currentPage - 1) * questionsPerPage,
      currentPage * questionsPerPage
    ) || [];

  return (
    <div className="flex flex-col h-screen bg-background-light dark:bg-background-dark">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/reading")}
            className="flex items-center gap-2 text-gray-900 dark:text-white hover:text-primary transition-colors"
          >
            <FaArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold text-gray-900 dark:text-white">
              IELTS
            </span>
            <span className="text-sm text-gray-900 dark:text-white opacity-70">
              ID: {mockReadingData.id}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-lg font-semibold text-gray-900 dark:text-white">
            {formatTime(timeRemaining)}
          </div>
          <button
            onClick={handleStart}
            disabled={isStarted}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Start
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleFullscreen}
              className="p-2 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            >
              {isFullscreen ? (
                <FaCompress className="w-5 h-5" />
              ) : (
                <FaExpand className="w-5 h-5" />
              )}
            </button>

            <button className="p-2 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors">
              <FaBars className="w-5 h-5" />
            </button>
            <button className="p-2 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors">
              <FaEdit className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden p-3" ref={containerRef}>
        {/* Left Panel - Reading Passage */}
        <div
          key={`passage-${currentPart}`}
          className="w-1/2 border rounded-2xl border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-y-auto transition-opacity duration-300 ease-in-out"
          style={{ width: `${leftWidth}%` }}
        >
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {currentPartData?.title}
            </h2>
            <p className="text-sm text-gray-900 dark:text-white opacity-70 mb-6">
              Read the text and answer questions{" "}
              {currentPartData?.questions[0]?.id || 0}-
              {currentPartData?.questions[currentPartData?.questions.length - 1]
                ?.id || 0}
              .
            </p>
            <div className="prose prose-sm max-w-none">
              <p className="text-gray-900 dark:text-white leading-relaxed whitespace-pre-line">
                {currentPartData?.passage}
              </p>
            </div>
          </div>
        </div>
        <div className="px-4">
          <div
            onMouseDown={startResize}
            className="w-0.5 cursor-col-resize bg-gray-600 dark:bg-gray-600 h-full flex justify-center items-center relative"
            title="Drag to resize"
          >
            <div className="w-6 h-6 rounded-2xl bg-white flex items-center justify-center absolute border-2">
              <LuChevronsLeftRight />
            </div>
          </div>
        </div>

        {/* Right Panel - Questions */}
        <div
          ref={questionsContainerRef}
          className="w-1/2 space-y-8 overflow-y-auto p-6 border rounded-2xl border-gray-300"
          style={{ width: `${100 - leftWidth}%` }}
        >
          {currentPartData.questions.map((question) => (
            <div
              key={question.id}
              ref={(el) => (questionRefs.current[question.id] = el)}
              data-id={question.id}
              className="p-4 rounded-lg border transition-all cursor-pointer
                  border-gray-200 dark:border-gray-700
                   dark:hover:bg-gray-800
                    dark:active:bg-gray-700
                   "
            >
              <p className="font-medium text-gray-900 dark:text-white mb-3">
                {question.id}. {question.text}
              </p>

              <div className="space-y-2">
                {["TRUE", "FALSE", "NOT GIVEN"].map((option) => (
                  <label
                    key={option}
                    className={`flex gap-3 items-center p-2 rounded-md transition-all
                        cursor-pointer
                        ${
                          answers[question.id] === option
                            ? "bg-blue-200 dark:bg-blue-900 text-blue-900 dark:text-blue-300"
                            : "hover:bg-blue-100 dark:hover:bg-blue-800 hover:text-blue-800 dark:hover:text-blue-200"
                        }`}
                  >
                    <input
                      type="radio"
                      name={`q-${question.id}`}
                      checked={answers[question.id] === option}
                      onChange={() => handleAnswerChange(question.id, option)}
                      className="accent-blue-500"
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
        {/* Part Navigation */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900 dark:text-white mr-2">
            Parts:
          </span>
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-md">
            {mockReadingData.parts.map((part) => (
              <button
                key={part.id}
                onClick={() => handlePartChange(part.id)}
                className={`
                  px-3 py-2 rounded-md text-sm font-medium transition-all duration-200
                  ${
                    currentPart === part.id
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-gray-900 dark:text-white hover:bg-white/50 dark:hover:bg-gray-600"
                  }
                `}
                aria-label={`Go to ${part.title}`}
              >
                {part.title}
              </button>
            ))}
          </div>
        </div>

        {/* Question Pagination */}
        <div className="flex items-center gap-2">
          <div className="flex flex-wrap gap-2 max-w-xl">
            {currentPartData.questions.map((q) => {
              const answered = answers[q.id];
              const active = activeQuestion === q.id;

              return (
                <button
                  key={q.id}
                  onClick={() => scrollToQuestion(q.id)}
                  className={`
          w-9 h-9 rounded-md text-sm font-semibold transition-all
          ${active ? "ring-2 ring-blue-500" : ""}
          ${
            answered
              ? "bg-green-600 text-white"
              : "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white"
          }
        `}
                  title={answered ? `Answered: ${answered}` : "Not answered"}
                >
                  {q.id}
                </button>
              );
            })}
          </div>
        </div>

        {/* Finish Button */}
        <div className="flex items-center gap-2">
          <button
            className="p-2 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors flex gap-3"
            onClick={() => setIsModalOpen(true)}
          >
            <FaCheck className="w-5 h-5" />
            Finish
          </button>

          {/* Modal */}
          <FinishModal
          link={"/reading-result/"+id}
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
          />
        </div>
      </footer>
    </div>
  );
};

export default ReadingPracticePage;

const mockReadingData = {
  id: 17212,
  parts: [
    {
      id: 1,
      title: "Part 1",
      passage: `Research on reef fish has presented numerous challenges. Conducting studies underwater requires specialized equipment and techniques. Researchers have developed purpose-built traps and aquariums to study these fish in controlled environments. Field trials involve collecting larval fish and transporting them with predatory fish to observe their interactions. The adaptation of reef fish to laboratory conditions has been crucial for understanding their behavior and survival mechanisms.

The "bigger is better" hypothesis has been a central focus of reef fish research. This hypothesis suggests that larger size at settlement increases survival against predators. However, initial research findings indicate that this is not always true, and there may be several reasons why larger individuals don't always have an advantage.

Reef-based predator communities vary significantly over short distances. Different predators prefer different types and sizes of prey based on physical characteristics such as mouth size and behavioral differences. These preferences determine which individual reef fish survive in their natural habitats. The complexity of these interactions makes it difficult to predict survival based solely on size.

Why don't larger individuals survive more often? The optimal foraging theory provides some insights. This theory suggests that being either very large or very small assists prey in escaping predators. It predicts that predators prefer prey offering the greatest energy return, which is a trade-off between energy intake and energy required to catch the prey. This often results in a preference for medium-sized prey, creating a survival advantage for both very small and very large individuals.

Interestingly, juvenile reef fish characteristics for surviving predatory attacks are not strongly associated with body size. For example, larger individuals are not necessarily faster, potentially making them easier to catch. According to optimal foraging theory, predators might prefer larger prey for their greater energy return, making larger size a distinct disadvantage during certain life stages. This counterintuitive finding challenges traditional assumptions about size and survival.`,
      questions: [
        {
          id: 1,
          text: "Research to date has concentrated on the importance of escape speed in surviving an attack by a predator.",
          type: "true_false_not_given",
        },
        {
          id: 2,
          text: "According to the 'bigger is better' hypothesis, larger animals have better eyesight.",
          type: "true_false_not_given",
        },
        {
          id: 3,
          text: "Early-juvenile reef fish share similar characteristics.",
          type: "true_false_not_given",
        },
        {
          id: 4,
          text: "Fully developed reef fish have a slower swimming speed than juveniles.",
          type: "true_false_not_given",
        },
        {
          id: 5,
          text: "Predators always prefer larger prey over smaller prey.",
          type: "true_false_not_given",
        },
        {
          id: 6,
          text: "The optimal foraging theory suggests predators prefer medium-sized prey.",
          type: "true_false_not_given",
        },
        {
          id: 7,
          text: "Larger reef fish are always faster swimmers than smaller ones.",
          type: "true_false_not_given",
        },
        {
          id: 8,
          text: "Reef-based predator communities are consistent across all locations.",
          type: "true_false_not_given",
        },
        {
          id: 9,
          text: "Laboratory conditions have been essential for understanding reef fish behavior.",
          type: "true_false_not_given",
        },
        {
          id: 10,
          text: "Size at settlement is the only factor determining survival.",
          type: "true_false_not_given",
        },
        {
          id: 11,
          text: "Predators base their prey selection only on size.",
          type: "true_false_not_given",
        },
        {
          id: 12,
          text: "Very small and very large prey both have survival advantages.",
          type: "true_false_not_given",
        },
        {
          id: 13,
          text: "Field trials involve observing fish in their natural habitats only.",
          type: "true_false_not_given",
        },
      ],
    },
    {
      id: 2,
      title: "Part 2",
      passage: `The development of renewable energy technologies has accelerated significantly in recent decades. Solar and wind power have become increasingly cost-effective, making them competitive with traditional fossil fuel sources. Governments worldwide have implemented policies to encourage the adoption of clean energy, recognizing the urgent need to address climate change.

Energy storage systems have emerged as a critical component of renewable energy infrastructure. Batteries and other storage technologies allow excess energy generated during peak production times to be stored and used when demand is high or production is low. This capability addresses one of the main challenges of renewable energy: its intermittent nature.

The transition to renewable energy is not without challenges. Infrastructure upgrades are necessary to accommodate distributed energy generation. Grid modernization requires significant investment and coordination between utilities, governments, and technology providers. However, the long-term benefits of reduced carbon emissions and energy independence make these investments worthwhile.

Innovation in renewable energy continues to drive down costs and improve efficiency. Research into new materials for solar panels and more efficient wind turbine designs promises even greater advances in the coming years. As technology improves and economies of scale are realized, renewable energy will become an even more attractive option for meeting global energy needs.`,
      questions: [
        {
          id: 14,
          text: "Solar and wind power are now cheaper than all fossil fuel sources.",
          type: "true_false_not_given",
        },
        {
          id: 15,
          text: "Energy storage systems solve the problem of renewable energy's intermittent nature.",
          type: "true_false_not_given",
        },
        {
          id: 16,
          text: "Grid modernization requires cooperation between multiple stakeholders.",
          type: "true_false_not_given",
        },
        {
          id: 17,
          text: "All governments have implemented policies to encourage renewable energy adoption.",
          type: "true_false_not_given",
        },
        {
          id: 18,
          text: "Batteries can store energy for use during low production periods.",
          type: "true_false_not_given",
        },
        {
          id: 19,
          text: "Renewable energy infrastructure requires no upgrades.",
          type: "true_false_not_given",
        },
        {
          id: 20,
          text: "Research is focused on improving solar panel materials.",
          type: "true_false_not_given",
        },
        {
          id: 21,
          text: "The cost of renewable energy will continue to decrease.",
          type: "true_false_not_given",
        },
      ],
    },
    {
      id: 3,
      title: "Part 3",
      passage: `Urban planning has evolved significantly to address the challenges of modern city living. Smart city initiatives integrate technology to improve efficiency, sustainability, and quality of life for residents. These initiatives often include intelligent transportation systems, energy-efficient buildings, and digital infrastructure that connects various city services.

Public transportation plays a crucial role in reducing traffic congestion and environmental impact. Cities that invest in comprehensive transit systems see benefits in reduced air pollution, lower transportation costs for residents, and improved accessibility. However, implementing effective public transit requires careful planning and significant financial investment.

Green spaces and parks are essential components of urban design. They provide recreational opportunities, improve air quality, and contribute to residents' mental and physical well-being. Urban planners increasingly recognize the value of integrating nature into city landscapes, creating a balance between development and environmental preservation.

The concept of walkable cities has gained traction as communities seek to reduce dependence on automobiles. Walkable neighborhoods with mixed-use development allow residents to access shops, services, and workplaces on foot, promoting healthier lifestyles and stronger community connections.`,
      questions: [
        {
          id: 22,
          text: "Smart city initiatives always improve quality of life.",
          type: "true_false_not_given",
        },
        {
          id: 23,
          text: "Public transportation reduces air pollution in cities.",
          type: "true_false_not_given",
        },
        {
          id: 24,
          text: "All cities have invested in comprehensive transit systems.",
          type: "true_false_not_given",
        },
        {
          id: 25,
          text: "Green spaces improve both physical and mental well-being.",
          type: "true_false_not_given",
        },
        {
          id: 26,
          text: "Walkable cities eliminate the need for automobiles completely.",
          type: "true_false_not_given",
        },
        {
          id: 27,
          text: "Mixed-use development is a feature of walkable neighborhoods.",
          type: "true_false_not_given",
        },
      ],
    },
    {
      id: 4,
      title: "Part 4",
      passage: `Artificial intelligence has transformed numerous industries, from healthcare to finance to transportation. Machine learning algorithms can process vast amounts of data to identify patterns and make predictions that would be impossible for humans to achieve manually. This capability has led to breakthroughs in medical diagnosis, fraud detection, and autonomous vehicle navigation.

However, the rise of AI also raises important ethical questions. Concerns about job displacement, algorithmic bias, and privacy have prompted calls for responsible AI development. Researchers and policymakers are working to establish guidelines that ensure AI benefits society while minimizing potential harms.

The future of AI development will likely focus on explainable AI, where systems can provide clear reasoning for their decisions. This transparency is crucial for building trust and ensuring that AI systems are used appropriately in critical applications such as healthcare and criminal justice.

Collaboration between technologists, ethicists, and policymakers will be essential to navigate the challenges and opportunities presented by artificial intelligence. As AI continues to evolve, maintaining a balance between innovation and ethical considerations will be paramount.`,
      questions: [
        {
          id: 28,
          text: "AI can process data faster than humans in all cases.",
          type: "true_false_not_given",
        },
        {
          id: 29,
          text: "Machine learning has improved medical diagnosis.",
          type: "true_false_not_given",
        },
        {
          id: 30,
          text: "All ethical concerns about AI have been resolved.",
          type: "true_false_not_given",
        },
        {
          id: 31,
          text: "Explainable AI provides clear reasoning for decisions.",
          type: "true_false_not_given",
        },
        {
          id: 32,
          text: "AI systems are never used in criminal justice applications.",
          type: "true_false_not_given",
        },
        {
          id: 33,
          text: "Collaboration is necessary for responsible AI development.",
          type: "true_false_not_given",
        },
      ],
    },
  ],
};
