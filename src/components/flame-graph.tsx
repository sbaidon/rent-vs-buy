import React, {
  useMemo,
  memo,
  useCallback,
  useState,
  useRef,
} from "react";
import { CalculatorValues, useCalculator } from "../context/calculator-context";
import { createRentingCalculator } from "../utils/country-rent-calculator";
import { createBuyingCalculator } from "../utils/country-buy-calculator";
import { findIntersectionPoints } from "../utils/calculator";
import { type PriceOutcome } from "../utils/calculator";
import { FlameGraphCanvas } from "./flame-graph-canvas";
import { COLORS, COLORS_LIGHT } from "../constants/colors";
import { useAppContext } from "../context/app-context";
import { useTheme } from "../context/theme-context";

type FlameGraphProps = {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  format?: (value: number) => string;
  leftColor?: string;
  rightColor?: string;
  label: string | React.ReactNode;
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
  leftColor,
  rightColor,
  label,
  sublabel,
  parameter,
}) => {
  const { values } = useCalculator();
  const { country } = useAppContext();
  const { resolvedTheme } = useTheme();

  const palette = resolvedTheme === "light" ? COLORS_LIGHT : COLORS;
  const resolvedLeftColor = leftColor ?? palette.RENT;
  const resolvedRightColor = rightColor ?? palette.BUY;

  // Visual segment count — decoupled from the slider's step size.
  // A minimum of 500 segments ensures the crossover point renders
  // accurately regardless of how coarse the input step is.
  // The bisection is O(log n) so this costs ~9 evaluations, not 500.
  const MIN_VISUAL_SEGMENTS = 500;
  const segments = Math.ceil(
    Math.min(Math.max(Math.abs(max - min) / step, MIN_VISUAL_SEGMENTS), 100000)
  );

  const flameGraphStep = useMemo(
    () => (max - min) / segments,
    [max, min, segments]
  );

  const segmentValues = useMemo(() => {
    const minValues = { ...values, [parameter]: min };
    const maxValues = { ...values, [parameter]: max };

    // Create country-aware calculators once — reused for both outcome and intersection
    const buyingCalculator = createBuyingCalculator(country, minValues);
    const rentingCalculator = createRentingCalculator(country, minValues);

    const rentStart = rentingCalculator.getTotalCost(minValues);
    const rentEnd = rentingCalculator.getTotalCost(maxValues);
    const buyStart = buyingCalculator.getTotalCost(minValues);
    const buyEnd = buyingCalculator.getTotalCost(maxValues);

    const isRentingBetterAtStart = rentStart < buyStart;
    const isRentingBetterAtEnd = rentEnd < buyEnd;

    let priceOutcome: PriceOutcome;
    if (isRentingBetterAtStart && isRentingBetterAtEnd) {
      priceOutcome = "rent";
    } else if (!isRentingBetterAtStart && !isRentingBetterAtEnd) {
      priceOutcome = "buy";
    } else if (isRentingBetterAtStart && !isRentingBetterAtEnd) {
      priceOutcome = "start-rent-end-buy";
    } else {
      priceOutcome = "start-buy-end-rent";
    }

    // For uniform outcomes, no search needed
    if (priceOutcome === "rent" || priceOutcome === "buy") {
      const rentingIsBetter = priceOutcome === "rent";
      return Array.from({ length: segments }, (_, i) => ({
        value: min + i * flameGraphStep,
        rentingIsBetter,
      }));
    }

    // Find the root of f(x) = rentCost(x) - buyCost(x) via bisection.
    // The caller guarantees opposite signs at the endpoints.
    const [crossover] = findIntersectionPoints({
      values,
      parameter,
      min,
      max,
      segments,
      step: flameGraphStep,
      buyingCalculator,
      rentingCalculator,
    });

    // "start-rent-end-buy" → renting is better before the crossover
    // "start-buy-end-rent" → buying is better before the crossover
    const rentingBetterAtStart = priceOutcome === "start-rent-end-buy";

    return Array.from({ length: segments }, (_, i) => ({
      value: min + i * flameGraphStep,
      rentingIsBetter: i < crossover ? rentingBetterAtStart : !rentingBetterAtStart,
    }));
  }, [min, max, segments, parameter, values, country, flameGraphStep]);

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
      const clampedValue = Math.min(Math.max(value, min), max);
      onChange(clampedValue);
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

  const handleRangeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(Number(e.target.value));
    },
    [onChange]
  );

  return (
    <div className="space-y-2 min-h-full h-auto w-full" ref={containerRef} data-testid={`flamegraph-${parameter}`}>
      <div className="flex justify-between items-baseline">
        <div className="relative border-b-2">
          <input
            ref={inputRef}
            type="number"
            min={min}
            step={step}
            max={max}
            className={`w-32 border-b text-[var(--text-primary)] border-[var(--border-default)] ${
              isEditing ? "opacity-100" : "opacity-0 absolute"
            }`}
            value={isEditing ? tempValue : value}
            onChange={handleInputChange}
            onKeyDown={handleInputKeyDown}
            onBlur={handleInputBlur}
            onFocus={handleStartEditing}
            aria-label={`Enter ${label}`}
            data-testid={`input-${parameter}`}
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
        {label}
      </div>

      <div className="group">
        <div className="cursor-pointer rounded group-focus-within:ring-2 group-focus-within:ring-blue-500 group-focus-within:ring-offset-2 relative">
          <FlameGraphCanvas
            segmentValues={segmentValues}
            height={height}
            leftColor={resolvedLeftColor}
            rightColor={resolvedRightColor}
            value={value}
            min={min}
            max={max}
            step={step}
            onChange={onChange}
            aria-hidden="true"
          />
          <input
            type="range"
            value={value}
            min={min}
            max={max}
            step={step}
            onChange={handleRangeChange}
            id={`${parameter}-input`}
            aria-label={typeof label === "string" ? label : parameter}
            aria-valuemin={min}
            aria-valuemax={max}
            aria-valuenow={value}
            aria-valuetext={format(value)}
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

const MemoizedFlameGraph = memo(FlameGraph);

// Track re-renders in development
if (import.meta.env.DEV) {
  MemoizedFlameGraph.whyDidYouRender = true;
}

export default MemoizedFlameGraph;
