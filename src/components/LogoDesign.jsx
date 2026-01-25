
import React from "react";
import { MdAutoStories } from "react-icons/md";

const LogoDesign = ({
  className = "",
  iconSize,
  textSize,
  color = "#1990e6",
  iconColor = "text-white",
  compact = false,
}) => {
  const iconBoxClass = compact ? "w-8 h-8" : "w-10 h-10";
  const size = compact ? 14 : (iconSize ?? 18);
  const text = textSize ?? (compact ? "text-lg" : "text-2xl");
  const gap = compact ? "gap-2" : "gap-3";

  return (
    <div className={`flex items-center ${gap} ${className}`}>
      <div className={`${iconBoxClass} rounded-full flex items-center justify-center shrink-0`} style={{ backgroundColor: color }}>
        <MdAutoStories className={iconColor} size={size} />
      </div>
      <span className={`${textSize} font-sans tracking-tight leading-none flex items-end`}>
        <span className="font-semibold italic" style={{ color: color }}>ielt</span>
        <span className="font-bold" style={{ color: color }}>s</span>
        <span className="font-black" style={{ color: color }}>core</span>
        <div className={`w-1 h-1 inline-block ml-0.5`} style={{ backgroundColor: color }}></div>
      </span>
    </div>
  );
};

export default LogoDesign;
