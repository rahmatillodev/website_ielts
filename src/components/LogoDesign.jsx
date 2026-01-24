
import React from "react";
import { MdAutoStories } from "react-icons/md";

const LogoDesign = ({
  className = "",
  iconSize = 18,
  textSize = "text-2xl",
  color = "#1990e6",
  iconColor = "text-white",
  backgroundColor = "#1990e6"
}) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>


      <div className="w-10 h-10 rounded-full  flex items-center justify-center flex-shrink-0" style={{ backgroundColor: color }}>
        <MdAutoStories className={iconColor} size={iconSize} />
      </div>

      <span className={`${textSize} font-sans tracking-tight leading-none`}>
        <span className="font-black" style={{ color: color }}>ielt</span>
        <span className="font-bold" style={{ color: color }}>s</span>
        <span className="font-semibold" style={{ color: color }}>core</span>
        <div className={`w-1 h-1 inline-block ml-0.5 ${color}`}></div>
      </span>
    </div>
  );
};

export default LogoDesign;
