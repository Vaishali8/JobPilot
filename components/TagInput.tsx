"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * TagInput — a text input that turns entered values into removable tags/badges.
 *
 * Used for the "Roles" and "Cities" fields in the preferences form.
 * Type a value and press Enter (or comma) to add it as a tag.
 * Click the X on a tag to remove it.
 *
 * Props:
 * - value: Current array of tags
 * - onChange: Callback when tags change
 * - suggestions: Optional list of pre-defined suggestions shown as a dropdown
 * - placeholder: Input placeholder text
 */

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
  className?: string;
}

export default function TagInput({
  value,
  onChange,
  suggestions = [],
  placeholder = "Type and press Enter...",
  className,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Add a new tag (avoids duplicates)
  const addTag = useCallback(
    (tag: string) => {
      const trimmed = tag.trim();
      if (trimmed && !value.includes(trimmed)) {
        onChange([...value, trimmed]);
      }
      setInputValue("");
    },
    [value, onChange]
  );

  // Remove a tag by index
  const removeTag = useCallback(
    (index: number) => {
      onChange(value.filter((_, i) => i !== index));
    },
    [value, onChange]
  );

  // Handle keyboard events: Enter to add, Backspace to remove last
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        if (inputValue.trim()) {
          addTag(inputValue);
        }
      } else if (e.key === "Backspace" && !inputValue && value.length > 0) {
        // Remove the last tag when backspacing on an empty input
        removeTag(value.length - 1);
      }
    },
    [inputValue, value, addTag, removeTag]
  );

  // Filter suggestions based on current input and already selected tags
  const filteredSuggestions = suggestions.filter(
    (s) =>
      !value.includes(s) &&
      s.toLowerCase().includes(inputValue.toLowerCase())
  );

  // Close suggestion dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Tags + input in a single bordered container */}
      <div
        className="flex min-h-[38px] flex-wrap items-center gap-1.5 rounded-md border border-input bg-transparent px-3 py-1.5 shadow-sm focus-within:ring-1 focus-within:ring-ring"
        onClick={() => inputRef.current?.focus()}
      >
        {/* Existing tags */}
        {value.map((tag, index) => (
          <Badge
            key={tag}
            variant="secondary"
            className="gap-1 pr-1"
          >
            {tag}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeTag(index);
              }}
              className="ml-0.5 rounded-sm hover:bg-secondary-foreground/20"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}

        {/* Text input */}
        <input
          ref={inputRef}
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? placeholder : ""}
          className="min-w-[120px] flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-md border border-border bg-popover py-1 shadow-md">
          {filteredSuggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => {
                addTag(suggestion);
                setShowSuggestions(false);
              }}
              className="w-full px-3 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
