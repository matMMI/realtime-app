import React from "react";

type Props = {
  color: string;
  x: number;
  y: number;
  name: string;
};

export default function Cursor({ color, x, y, name }: Props) {
  return (
    <div
      className="pointer-events-none absolute top-0 left-0 transition-all duration-200 ease-linear z-50"
      style={{ transform: `translateX(${x}px) translateY(${y}px)` }}
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="transform -translate-x-1 -translate-y-1"
      >
        <path
          d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19169L11.7841 12.3673H5.65376Z"
          fill={color}
          stroke="white"
        />
      </svg>
      <div
        className="absolute left-2 top-4 px-2 py-1 rounded-md text-xs text-white font-semibold whitespace-nowrap"
        style={{ backgroundColor: color }}
      >
        {name}
      </div>
    </div>
  );
}
