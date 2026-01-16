import React from 'react'

const ComingSoonPage = () => {
  return (
    <div className='w-full h-full flex flex-col items-center justify-center gap-8 px-4'>
      {/* Первый параграф с увеличенным расстоянием между букв */}
      <p className='text-lg tracking-[0.2em] uppercase text-gray-600 dark:text-gray-400'>
        stay tuned
      </p>

      {/* Градиентный заголовок с исправленным background-clip */}
      <h1 className='text-center text-8xl md:text-9xl font-black leading-[0.9]'>
        <span
          className="
        bg-gradient-to-b 
        from-gray-900 
        to-gray-900/20 
        dark:from-white 
        dark:to-white/20
        text-transparent
        bg-clip-text
        [-webkit-background-clip:text]
        [-webkit-text-fill-color:transparent]
      "
        >
          Coming
        </span>
        <br />
        <span
          className="
        bg-gradient-to-b 
        from-gray-900/80 
        to-gray-900/10 
        dark:from-white/80 
        dark:to-white/10
        text-transparent
        bg-clip-text
        [-webkit-background-clip:text]
        [-webkit-text-fill-color:transparent]
      "
        >
          Soon
        </span>
      </h1>

      <p className='text-gray-500 dark:text-gray-400 mt-4'>
        more information at:
      </p>
    </div>
  )
}

export default ComingSoonPage