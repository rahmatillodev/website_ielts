import CardLocked from '@/components/cards/CardLocked';
import { Button } from '@/components/ui/button';
import React from 'react'
import { LuPenTool } from 'react-icons/lu';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const ComingSoonPage = ({ title, description, type }) => {
  const mockData = [
    {
      id: "1",
      title: "Basic Reading Practice",
      duration: 10,
      defficuity: "EASY",
      is_active: true,
      is_premium: true,
      question_quantity: 5,
      type: "reading",
    },
    {
      id: "2",
      title: "Everyday Conversations",
      duration: 15,
      defficuity: "EASY",
      is_active: true,
      is_premium: true,
      question_quantity: 7,
      type: "reading",
    },
    {
      id: "3",
      title: "Intermediate Text Analysis",
      duration: 20,
      defficuity: "MEDIUM",
      is_active: true,
      is_premium: true,
      question_quantity: 10,
      type: "reading",
    },
    {
      id: "4",
      title: "Advanced Text Analysis",
      duration: 25,
      defficuity: "HARD",
      is_active: true,
      is_premium: true,
      question_quantity: 15,
      type: "reading",
    },
    {
      id: "5",
      title: "Advanced Text Analysis",
      duration: 25,
      defficuity: "HARD",
      is_active: true,
      is_premium: true,
      question_quantity: 15,
      type: "reading",
    },
    {
      id: "6",
      title: "Advanced Text Analysis",
      duration: 25,
      defficuity: "HARD",
      is_active: true,
      is_premium: true,
      question_quantity: 15,
      type: "reading",
    },
  ];

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.05,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3,
        ease: "easeOut",
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, scale: 0.8, y: 30 },
    visible: (i) => ({
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        duration: 0.3,
        delay: i * 0.05,
        ease: "easeOut",
      },
    }),
  };

  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.4,
        delay: 0.1,
      },
    },
  };

  const textVariants = {
    hidden: { opacity: 0, scale: 0.5 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.4,
        ease: "easeOut",
      },
    },
  };

  const stayTunedVariants = {
    hidden: { opacity: 0, y: -20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3,
        delay: 0.2,
        ease: "easeOut",
      },
    },
  };

  return (
    <motion.div
      className='w-full h-full flex flex-col items-center justify-start gap-8 relative px-8 py-6'
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div
        className='relative text-start w-full flex items-center justify-between '
        variants={itemVariants}
      >
        <div>
          <motion.h1
            className='text-2xl md:text-3xl font-semibold text-gray-900 mb-2'
            variants={itemVariants}
          >
            {title}
          </motion.h1>
          <motion.p
            className='text-sm md:text-base text-gray-500 font-medium tracking-tight'
            variants={itemVariants}
          >
            {description}
          </motion.p>
        </div>
        <motion.div variants={itemVariants}>
          {type === "writing" && <Link to="/writing-own">
            <Button>
              <LuPenTool className='w-4 h-4' />
              <span>Practice Now</span>
            </Button>
          </Link>}
        </motion.div>
      </motion.div>
      <div className='w-full h-full relative overflow-hidden'>

        {/* Размытый фон */}
        <motion.div
          className='w-full h-full absolute left-0 top-0 z-50 flex items-center justify-center'
          style={{
            background: "rgba(255, 255, 255, 0.2)",
            borderRadius: "16px",
            backdropFilter: "blur(7px)",
            WebkitBackdropFilter: "blur(7px)",
            border: "1px solid rgba(255, 255, 255, 0.3)"
          }}
          variants={overlayVariants}
        >
          <div className="relative z-10 flex flex-col items-center gap-8">
            <motion.p
              className='
            text-base
            sm:text-lg 
            md:text-xl 
            lg:text-2xl 
            tracking-[0.2em] 
            uppercase 
            text-gray-600 
            dark:text-gray-400'
              variants={stayTunedVariants}
            >
              stay tuned
            </motion.p>

            <motion.h1
              className='
            text-center 
            text-5xl 
            sm:text-7xl 
            md:text-8xl 
            lg:text-9xl 
            font-black 
            leading-[0.9]'
              variants={textVariants}
            >
              <motion.span
                className="bg-gradient-to-b 
              from-gray-900
              to-gray-900/50 
              dark:from-white 
              dark:to-white/20
              text-transparent
              bg-clip-text
              font-black
              [-webkit-background-clip:text]
              [-webkit-text-fill-color:transparent]"
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.3 }}
              >
                Coming
              </motion.span>
              <br />
              <motion.span
                className="bg-gradient-to-b 
              from-gray-900/90 
              to-gray-900/50
              dark:from-white/90 
              dark:to-white/50
              text-transparent
              bg-clip-text
              font-black
              [-webkit-background-clip:text]
              [-webkit-text-fill-color:transparent]"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.4 }}
              >
                Soon
              </motion.span>
            </motion.h1>

            {/* <p className='text-gray-500 dark:text-gray-400 mt-4'>
            more information at:
          </p> */}
          </div>
        </motion.div>
        {mockData.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-hidden inset-0 z-0">
            {mockData.map((test, index) => {
              return (
                <motion.div
                  key={test.id}
                  custom={index}
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                >
                  <CardLocked
                    {...test}
                    isGridView={true}
                  />
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

    </motion.div>
  )
}

export default ComingSoonPage