import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "../lib/utils";

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
}

export function CustomSelect({ value, onChange, options }: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full px-3 py-2 border rounded-lg text-sm bg-app-bg cursor-pointer flex items-center justify-between transition-colors",
          isOpen ? "border-app-brand bg-app-surface" : "border-app-border hover:border-gray-500"
        )}
      >
        <span className="text-app-primary">{value}</span>
        <ChevronDown className={cn("w-4 h-4 text-app-secondary transition-transform", isOpen && "rotate-180")} />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-app-surface border border-app-border rounded-lg shadow-xl overflow-hidden py-1">
          {options.map((opt) => (
            <div
              key={opt}
              onClick={() => {
                onChange(opt);
                setIsOpen(false);
              }}
              className={cn(
                "px-3 py-2 text-sm cursor-pointer flex items-center justify-between transition-colors",
                value === opt
                  ? "bg-[#E04B0E]/10 text-app-brand font-medium"
                  : "text-app-primary hover:bg-app-bg hover:text-app-brand"
              )}
            >
              <span>{opt}</span>
              {value === opt && <Check className="w-3.5 h-3.5 text-app-brand" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
