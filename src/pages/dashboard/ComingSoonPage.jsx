import  CardLocked from '@/components/cards/CardLocked';
import React from 'react'

const ComingSoonPage = () => {
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
  ];
  return (
    <div className='w-full h-full flex flex-col items-center justify-start gap-8 py-8 px-6 relative overflow-hidden'>
      {/* Размытый фон */}
      <div className='w-full h-full absolute left-0 top-0 z-10 flex items-center justify-center' 
      style={{
        background: "rgba(255, 255, 255, 0.2)",
        borderRadius: "16px",
        backdropFilter: "blur(7px)",
        WebkitBackdropFilter: "blur(7px)",
        border: "1px solid rgba(255, 255, 255, 0.3)"
      }}>
        <div className="relative z-10 flex flex-col items-center gap-8">
          <p className='
            text-base
            sm:text-lg 
            md:text-xl 
            lg:text-2xl 
            tracking-[0.2em] 
            uppercase 
            text-gray-600 
            dark:text-gray-400'>
            stay tuned
          </p>

          <h1 className='
            text-center 
            text-5xl 
            sm:text-7xl 
            md:text-8xl 
            lg:text-9xl 
            font-black 
            leading-[0.9]'
          >
            <span
              className="bg-gradient-to-b 
              from-gray-900
              to-gray-900/50 
              dark:from-white 
              dark:to-white/20
              text-transparent
              bg-clip-text
              font-black
              [-webkit-background-clip:text]
              [-webkit-text-fill-color:transparent]">
                Coming
            </span>
            <br />
            <span className="bg-gradient-to-b 
              from-gray-900/90 
              to-gray-900/50
              dark:from-white/90 
              dark:to-white/50
              text-transparent
              bg-clip-text
              font-black
              [-webkit-background-clip:text]
              [-webkit-text-fill-color:transparent]">
                Soon
            </span>
          </h1>

          {/* <p className='text-gray-500 dark:text-gray-400 mt-4'>
            more information at:
          </p> */}
        </div>
      </div>
      {mockData.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-hidden inset-0 z-0">
          {mockData.map((test) => {
              return ( 
              <CardLocked
                key={test.id}
                {...test}
                isGridView={true}
              />
            );
          })}
        </div>
      )}
    </div>
  )
}

export default ComingSoonPage