import React, { useEffect, useRef, useState } from "react";

interface TooltipProps {
  content: string;
  iconClassName?: string;
}

const Tooltip: React.FC<TooltipProps> = ({
  content,
  iconClassName = "text-acadia-200",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        tooltipRef.current &&
        !tooltipRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div
      ref={tooltipRef}
      className="relative ml-2 group"
      onClick={() => setIsOpen(!isOpen)}
    >
      <div className="cursor-help">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className={`w-4 h-4 ${iconClassName}`}
        >
          <path
            fillRule="evenodd"
            d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm8.706-1.442c1.146-.573 2.437.463 2.126 1.706l-.709 2.836.042-.02a.75.75 0 01.67 1.34l-.04.022c-1.147.573-2.438-.463-2.127-1.706l.71-2.836-.042.02a.75.75 0 11-.671-1.34l.041-.022zM12 9a.75.75 0 100-1.5.75.75 0 000 1.5z"
            clipRule="evenodd"
          />
        </svg>
      </div>
      <div
        className={`absolute z-10 max-w-[150px] w-64 p-2 text-sm text-white bg-gray-800 rounded-lg right-0 mr-2 ${
          isOpen ? "visible" : "invisible group-hover:visible"
        }`}
      >
        {content}
      </div>
    </div>
  );
};

export default Tooltip;
