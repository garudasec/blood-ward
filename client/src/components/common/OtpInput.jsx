import React, { useRef, useEffect } from "react";

export default function OtpInput({
  value = "",
  onChange,
  numInputs = 6,
  disabled = false,
  hasError = false,
}) {
  const inputsRef = useRef([]);

  // Ensure digits array matches length
  const digits = value.split("").slice(0, numInputs);
  while (digits.length < numInputs) {
    digits.push("");
  }

  const handleChange = (e, index) => {
    const val = e.target.value;
    const cleanDigit = val.replace(/\D/g, "").slice(-1);

    const newDigits = [...digits];
    newDigits[index] = cleanDigit;
    const newOtp = newDigits.join("");
    onChange(newOtp);

    // Auto-focus next input if a digit was entered
    if (cleanDigit && index < numInputs - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace") {
      if (!digits[index] && index > 0) {
        // Move focus backward and delete previous
        const newDigits = [...digits];
        newDigits[index - 1] = "";
        onChange(newDigits.join(""));
        inputsRef.current[index - 1]?.focus();
      } else {
        const newDigits = [...digits];
        newDigits[index] = "";
        onChange(newDigits.join(""));
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputsRef.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < numInputs - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text/plain").trim();
    const digitsOnly = pastedData.replace(/\D/g, "").slice(0, numInputs);

    if (digitsOnly) {
      onChange(digitsOnly);
      const focusIndex = Math.min(digitsOnly.length, numInputs - 1);
      inputsRef.current[focusIndex]?.focus();
    }
  };

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3" onPaste={handlePaste}>
      {Array.from({ length: numInputs }).map((_, i) => (
        <input
          key={i}
          ref={(el) => (inputsRef.current[i] = el)}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={digits[i] || ""}
          disabled={disabled}
          onChange={(e) => handleChange(e, i)}
          onKeyDown={(e) => handleKeyDown(e, i)}
          className={`w-11 h-13 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-bold rounded-xl border transition-all outline-none ${
            hasError
              ? "border-[#EF4444] text-[#EF4444] bg-[#FEF2F2] dark:bg-[#EF4444]/10 focus:ring-2 focus:ring-[#EF4444]/30"
              : "border-[#E2E8F0] dark:border-[#2D3748] bg-white dark:bg-[#1A1D24] text-[#1E293B] dark:text-[#F1F5F9] focus:border-[#A61B2B] focus:ring-2 focus:ring-[#A61B2B]/20"
          } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        />
      ))}
    </div>
  );
}
