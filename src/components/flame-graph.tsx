import React, { useMemo, memo, useCallback, useState, useRef } from "react";
import { CalculatorValues, useCalculator } from "../context/calculator-context";
import { RentingCostsCalculator } from "../utils/rent-costs-calculator";
import { BuyingCostsCalculator } from "../utils/buy-costs-calculator";
import { findIntersectionPoint } from "../utils/calculator";
import { type PriceOutcome } from "../utils/calculator";
import { FlameGraphCanvas } from "./flame-graph-canvas";
import { COLORS } from "../constants/colors";

type FlameGraphProps = {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  format?: (value: number) => string;
  leftColor?: string;
  rightColor?: string;
  label: string;
  sublabel?: string;
  parameter: keyof CalculatorValues;
};

const height = 50;

const FlameGraph: React.FC<FlameGraphProps> = ({
  value,
  min,
  max,
  step,
  onChange,
  format = (v) => v.toString(),
  leftColor = COLORS.RENT,
  rightColor = COLORS.BUY,
  label,
  sublabel,
  parameter,
}) => {
  const { values } = useCalculator();

  const handleChange = useCallback(
    (newValue: number) => {
      onChange(newValue);
    },
    [onChange]
  );

  const segments = Math.ceil(
    Math.min(Math.max(Math.abs(max - min) / step, 100), 100000)
  );
  console.log(segments);
  const minValues = useMemo(
    () => ({
      ...values,
      [parameter]: min,
    }),
    [min, parameter, values]
  );
  const maxValues = useMemo(
    () => ({
      ...values,
      [parameter]: max,
    }),
    [max, parameter, values]
  );

  const priceOutcome: PriceOutcome = useMemo(() => {
    const buyingCalculator = new BuyingCostsCalculator(minValues);
    const rentingCalculator = new RentingCostsCalculator(minValues);

    const rentStart = rentingCalculator.getTotalCost(minValues);
    const rentEnd = rentingCalculator.getTotalCost(maxValues);

    const buyStart = buyingCalculator.getTotalCost(minValues);
    const buyEnd = buyingCalculator.getTotalCost(maxValues);

    const isRentingBetterAtStart = rentStart < buyStart;
    const isRentingBetterAtEnd = rentEnd < buyEnd;

    let outcome: PriceOutcome;

    if (isRentingBetterAtStart && isRentingBetterAtEnd) {
      outcome = "rent";
    } else if (!isRentingBetterAtStart && !isRentingBetterAtEnd) {
      outcome = "buy";
    } else if (isRentingBetterAtStart && !isRentingBetterAtEnd) {
      outcome = "start-rent-end-buy";
    } else {
      outcome = "start-buy-end-rent";
    }

    return outcome;
  }, [maxValues, minValues]);

  const getOpacity = useCallback(
    (index: number, intersectionIndex: number | null) => {
      if (intersectionIndex === null) return 1; // Full opacity when no intersection

      // Calculate distance from intersection point (0 to 1 scale)
      const distance = Math.abs(index - intersectionIndex) / (segments / 2);
      // Convert distance to opacity (0.4 to 1 range)
      return 0.6 + distance * 0.7;
    },
    [segments]
  );

  const segmentValues = useMemo(() => {
    const length = segments;
    const arr = new Array<{
      value: number;
      rentingIsBetter: boolean;
      opacity: number;
    }>(length);
    const flameGraphStep = (max - min) / (segments - 1);

    switch (priceOutcome) {
      case "rent":
        for (let i = 0; i < length; i++) {
          const x = min + i * flameGraphStep;
          arr[i] = { value: x, rentingIsBetter: true, opacity: 1 };
        }
        break;
      case "buy":
        for (let i = 0; i < length; i++) {
          const x = min + i * flameGraphStep;
          arr[i] = { value: x, rentingIsBetter: false, opacity: 1 };
        }
        break;
      case "start-buy-end-rent": {
        const intersectionIndex = findIntersectionPoint(
          values,
          parameter,
          min,
          max,
          segments,
          flameGraphStep
        );
        for (let i = 0; i < length; i++) {
          arr[i] = {
            value: min + i * flameGraphStep,
            rentingIsBetter: i > intersectionIndex,
            opacity: getOpacity(i, intersectionIndex),
          };
        }
        break;
      }
      case "start-rent-end-buy": {
        const intersectionIndex = findIntersectionPoint(
          values,
          parameter,
          min,
          max,
          segments,
          flameGraphStep
        );
        for (let i = 0; i < length; i++) {
          arr[i] = {
            value: min + i * flameGraphStep,
            rentingIsBetter: i < intersectionIndex,
            opacity: getOpacity(i, intersectionIndex),
          };
        }
        break;
      }
    }

    return arr;
  }, [min, max, segments, parameter, values, priceOutcome, getOpacity]);

  const containerRef = React.useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleStartEditing = () => {
    setIsEditing(true);
    setTempValue(value);
  };

  const commitValue = (value: number) => {
    if (!isNaN(value)) {
      const snappedValue = Math.round(value / step) * step;
      const clampedValue = Math.min(Math.max(snappedValue, min), max);
      handleChange(clampedValue);
      return [true, clampedValue] as const;
    }
    return [false, value] as const;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setTempValue(value);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      const [success, result] = commitValue(tempValue);
      if (success) {
        setIsEditing(false);
        onChange(result);
      } else {
        // Reset to the current valid value if input was invalid
        setTempValue(value);
      }
    } else if (e.key === "Escape") {
      // Cancel editing and revert to previous value
      setIsEditing(false);
      setTempValue(value);
    }
  };

  const handleInputBlur = () => {
    commitValue(tempValue);
    setIsEditing(false);
  };

  return (
    <div className="space-y-2 min-h-full h-auto w-full" ref={containerRef}>
      <div className="flex justify-between items-baseline">
        <div className="relative">
          <input
            ref={inputRef}
            type="number"
            min={min}
            step={step}
            max={max}
            className={`w-32 border-b text-acadia-100 border-gray-300 ${
              isEditing ? "opacity-100" : "opacity-0 absolute"
            }`}
            value={isEditing ? tempValue : value}
            onChange={handleInputChange}
            onKeyDown={handleInputKeyDown}
            onBlur={handleInputBlur}
            onFocus={handleStartEditing}
            aria-label={`Enter ${label}`}
          />
          <p
            className={`cursor-text ${
              isEditing ? "opacity-0 absolute" : "opacity-100"
            }`}
            onClick={handleStartEditing}
          >
            {format(value)}
          </p>
        </div>
        {sublabel && <p className="mt-1">{sublabel}</p>}
        <p>{label}</p>
      </div>

      <div className="group">
        <div className="cursor-pointer rounded group-focus-within:ring-2 group-focus-within:ring-blue-500 group-focus-within:ring-offset-2 relative">
          <FlameGraphCanvas
            segmentValues={segmentValues}
            height={height}
            leftColor={leftColor}
            rightColor={rightColor}
            value={value}
            min={min}
            max={max}
            step={step}
            onChange={onChange}
          />
          <input
            type="range"
            value={value}
            min={min}
            max={max}
            step={step}
            onChange={(e) => onChange(Number(e.target.value))}
            aria-label={label}
            id={`${parameter}-input`}
            className="absolute top-0 left-0 w-full h-full cursor-pointer appearance-none bg-transparent
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 
              [&::-webkit-slider-thumb]:rounded-none [&::-webkit-slider-thumb]:bg-white/80 [&::-webkit-slider-thumb]:cursor-pointer
              [&::-webkit-slider-thumb]:rotate-45 
              [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-gray-800
              [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 
              [&::-moz-range-thumb]:rounded-none [&::-moz-range-thumb]:bg-white/80 [&::-moz-range-thumb]:cursor-pointer
              [&::-moz-range-thumb]:rotate-45 
              [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-gray-800
              [&::-webkit-slider-runnable-track]:appearance-none [&::-webkit-slider-runnable-track]:bg-transparent
              [&::-moz-range-track]:appearance-none [&::-moz-range-track]:bg-transparent"
          />
        </div>
      </div>
    </div>
  );
};

export default memo(FlameGraph);
