import React, {
  useMemo,
  memo,
  useCallback,
  useLayoutEffect,
  useState,
  useRef,
} from "react";
import { CalculatorValues, useCalculator } from "../context/calculator-context";
import { RentingCostsCalculator } from "../utils/rent-costs-calculator";
import { BuyingCostsCalculator } from "../utils/buy-costs-calculator";
import { findIntersectionPoint } from "../utils/calculator";
import { FlameGraphCanvas } from "./flame-graph-canvas";

type SegmentValue = {
  value: number;
  rentingIsBetter: boolean;
};

type FlameGraphVisualizationProps = {
  segmentValues: SegmentValue[];
  width: number;
  height: number;
  leftColor: string;
  rightColor: string;
  format: (value: number) => string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
};

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

const FlameGraphVisualization = memo<FlameGraphVisualizationProps>(
  ({
    segmentValues,
    width,
    height,
    leftColor,
    rightColor,
    value,
    min,
    max,
    step,
    onChange,
  }) => {
    const scaleValue = useCallback(
      (val: number) => {
        const domain = max - min;
        const range = width;
        return ((val - min) / domain) * range;
      },
      [min, max, width]
    );

    const handleDrag = useCallback(
      (e: React.PointerEvent) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const newValue = min + (x / width) * (max - min);
        const snappedValue = Math.round(newValue / step) * step;

        if (snappedValue >= min && snappedValue <= max) {
          onChange(snappedValue);
        }
      },
      [min, max, width, step, onChange]
    );

    const segmentWidth = useMemo(
      () => Math.max(width / segmentValues.length - 1, 0),
      [segmentValues, width]
    );

    return (
      <svg
        width="100%"
        height={height}
        className="cursor-pointer"
        onPointerDown={handleDrag}
        onPointerMove={(e) => e.buttons === 1 && handleDrag(e)}
      >
        <g>
          {segmentValues.map((segment, i) => (
            <rect
              key={i}
              x={scaleValue(segment.value)}
              y={0}
              width={segmentWidth}
              height={height}
              fill={segment.rentingIsBetter ? leftColor : rightColor}
            />
          ))}
        </g>
        <path
          d="M0,-12 L8,0 L0,12 L-8,0 Z"
          fill="#4b5563"
          transform={`translate(${scaleValue(value)}, ${height / 2})`}
        />
      </svg>
    );
  }
);

type PriceOutcome =
  | "rent"
  | "buy"
  | "start-rent-end-buy"
  | "start-buy-end-rent";

const FlameGraph: React.FC<FlameGraphProps> = ({
  value,
  min,
  max,
  step,
  onChange,
  format = (v) => v.toString(),
  leftColor = "rgb(59, 130, 246)",
  rightColor = "rgb(139, 92, 246)",
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

  const segments = Math.ceil(Math.abs(max - min) / step);
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

  const segmentValues = useMemo(() => {
    const length = segments;
    const arr = new Array<{ value: number; rentingIsBetter: boolean }>(length);

    switch (priceOutcome) {
      case "rent":
        for (let i = 0; i < length; i++) {
          const x = min + i * step;
          arr[i] = { value: x, rentingIsBetter: true };
        }
        break;
      case "buy":
        for (let i = 0; i < length; i++) {
          const x = min + i * step;
          arr[i] = { value: x, rentingIsBetter: false };
        }
        break;
      case "start-buy-end-rent": {
        const intersectionIndex = findIntersectionPoint(
          values,
          parameter,
          min,
          max,
          segments,
          step
        );
        for (let i = 0; i < length; i++) {
          arr[i] = {
            value: min + i * step,
            rentingIsBetter: i > intersectionIndex,
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
          step
        );
        for (let i = 0; i < length; i++) {
          arr[i] = {
            value: min + i * step,
            rentingIsBetter: i < intersectionIndex,
          };
        }
        break;
      }
    }

    return arr;
  }, [min, max, step, segments, parameter, values, priceOutcome]);

  const containerRef = React.useRef<HTMLDivElement>(null);
  const [width, setWidth] = React.useState(1000);

  useLayoutEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setWidth(containerRef.current.offsetWidth);
      }
    };

    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

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
      return [true, value] as const;
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
    <div className="space-y-2 relative" ref={containerRef}>
      <div className="flex justify-between items-baseline">
        <div>
          {isEditing ? (
            <input
              ref={inputRef}
              type="number"
              min={min}
              step={step}
              max={max}
              className="text-2xl font-normal text-gray-900 w-32 outline-none border-b border-gray-300"
              value={tempValue}
              onChange={handleInputChange}
              onKeyDown={handleInputKeyDown}
              onBlur={handleInputBlur}
              autoFocus
            />
          ) : (
            <span
              className="text-2xl font-normal text-gray-900 cursor-text"
              onClick={handleStartEditing}
            >
              {format(value)}
            </span>
          )}
          {sublabel && (
            <div className="text-sm text-gray-500 mt-1">{sublabel}</div>
          )}
        </div>
        <div className="text-sm text-gray-500">{label}</div>
      </div>

      <FlameGraphCanvas
        segmentValues={segmentValues}
        width={width}
        height={height}
        leftColor={leftColor}
        rightColor={rightColor}
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={handleChange}
      />
    </div>
  );
};

export default memo(FlameGraph);
