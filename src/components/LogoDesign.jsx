
import React from "react";
import { MdAutoStories } from "react-icons/md";

const LogoDesign = ({
  className = "",
  iconSize = 18,
  textSize = "text-2xl"
}) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      
   
      <div className="w-10 h-10 rounded-full bg-[#1990e6] flex items-center justify-center flex-shrink-0">
        <MdAutoStories className="text-white" size={iconSize} />
      </div>

      <span className={`${textSize} font-sans tracking-tight leading-none`}>
        <span className="font-black text-[#1990e6]">ielt</span>
        <span className="font-bold text-[#1990e6]">s</span>
        <span className="font-semibold text-[#1990e6]">core</span>
        <div className="w-1 h-1 bg-[#1990e6] inline-block ml-0.5"></div>
      </span>
    </div>
  );
};

export default LogoDesign;
