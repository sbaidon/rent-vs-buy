import React, {
  useCallback,
  useMemo,
  useRef,
  useEffect,
  useState,
  startTransition,
} from "react";

type SegmentValue = {
  value: number;
  rentingIsBetter: boolean;
  opacity: number;
};

type FlameGraphCanvasProps = {
  segmentValues: SegmentValue[];
  height: number;
  leftColor: string;
  rightColor: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (val: number) => void;
};

export const FlameGraphCanvas = React.memo(
  ({
    segmentValues,
    height,
    leftColor,
    rightColor,
    value,
    min,
    max,
    step,
    onChange,
  }: FlameGraphCanvasProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerWidth, setContainerWidth] = useState(0);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const scaleValue = useCallback(
      (val: number) => {
        const domain = max - min;
        return ((val - min) / domain) * containerWidth;
      },
      [min, max, containerWidth]
    );

    const segmentWidth = useMemo(
      () => Math.max(containerWidth / segmentValues.length - 1, 0),
      [segmentValues.length, containerWidth]
    );

    // Update width on mount and resize
    useEffect(() => {
      const updateWidth = () => {
        if (containerRef.current) {
          setContainerWidth(containerRef.current.offsetWidth);
        }
      };

      updateWidth(); // Initial measurement
      window.addEventListener("resize", updateWidth);

      return () => window.removeEventListener("resize", updateWidth);
    }, []);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      canvas.width = containerWidth * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
      canvas.style.width = containerWidth + "px";
      canvas.style.height = height + "px";
      ctx.clearRect(0, 0, containerWidth, height);

      for (let i = 0, n = segmentValues.length; i < n; ++i) {
        const seg = segmentValues[i];
        const x = scaleValue(seg.value);

        ctx.globalAlpha = seg.opacity;
        ctx.fillStyle = seg.rentingIsBetter ? leftColor : rightColor;
        ctx.fillRect(x, 0, segmentWidth, height);
      }
    }, [
      segmentValues,
      containerWidth,
      height,
      leftColor,
      rightColor,
      value,
      segmentWidth,
      scaleValue,
    ]);

    const handleDrag = useCallback(
      (e: React.PointerEvent<HTMLCanvasElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const newValue = min + (x / containerWidth) * (max - min);

        const snappedValue = Math.round(newValue / step) * step;

        if (snappedValue >= min && snappedValue <= max) {
          startTransition(() => {
            onChange(snappedValue);
          });
        }
      },
      [min, max, containerWidth, step, onChange]
    );

    return (
      <div ref={containerRef} style={{ width: "100%", height }}>
        <canvas
          ref={canvasRef}
          style={{ cursor: "pointer", display: "block" }}
          onPointerDown={handleDrag}
          onPointerMove={(e) => e.buttons === 1 && handleDrag(e)}
        />
      </div>
    );
  }
);
