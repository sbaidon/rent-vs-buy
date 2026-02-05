import React, {
  useCallback,
  useRef,
  useLayoutEffect,
} from "react";

type SegmentValue = {
  value: number;
  rentingIsBetter: boolean;
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

/**
 * Draw a gradient that transitions from one color to the other at the
 * crossover point. The transition zone is proportional to the bar width
 * so the crossover is visible but not a jarring hard edge.
 */
function drawCanvas(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  segmentValues: SegmentValue[],
  min: number,
  max: number,
  leftColor: string,
  rightColor: string,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.scale(dpr, dpr);
  canvas.style.width = width + "px";
  canvas.style.height = height + "px";
  ctx.clearRect(0, 0, width, height);

  if (segmentValues.length === 0) return;

  const n = segmentValues.length;
  const firstRenting = segmentValues[0].rentingIsBetter;
  const lastRenting = segmentValues[n - 1].rentingIsBetter;

  // Determine left/right colors based on which outcome is at each end.
  const colorAtStart = firstRenting ? leftColor : rightColor;
  const colorAtEnd = lastRenting ? leftColor : rightColor;

  // Uniform: no crossover — single solid color.
  if (firstRenting === lastRenting) {
    ctx.fillStyle = colorAtStart;
    ctx.fillRect(0, 0, width, height);
    return;
  }

  // Find the crossover position (first segment where the color flips).
  let crossoverIdx = 0;
  for (let i = 1; i < n; i++) {
    if (segmentValues[i].rentingIsBetter !== firstRenting) {
      crossoverIdx = i;
      break;
    }
  }

  const crossoverFraction = crossoverIdx / n;

  // Transition zone: 4% of the bar width, centered on the crossover.
  // Tight enough to clearly show where the crossover is, but smooth
  // enough to avoid a jarring hard edge.
  const transitionWidth = 0.04;
  const fadeStart = Math.max(0, crossoverFraction - transitionWidth / 2);
  const fadeEnd = Math.min(1, crossoverFraction + transitionWidth / 2);

  const gradient = ctx.createLinearGradient(0, 0, width, 0);
  gradient.addColorStop(0, colorAtStart);
  gradient.addColorStop(fadeStart, colorAtStart);
  gradient.addColorStop(fadeEnd, colorAtEnd);
  gradient.addColorStop(1, colorAtEnd);

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

export const FlameGraphCanvas = React.memo(
  ({
    segmentValues,
    height,
    leftColor,
    rightColor,
    min,
    max,
    step,
    onChange,
  }: FlameGraphCanvasProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    // Use ref to store width to avoid re-render cycles
    const widthRef = useRef(0);

    // Draw on initial mount and whenever segment data / colors change
    useLayoutEffect(() => {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;

      widthRef.current = container.offsetWidth;
      drawCanvas(canvas, widthRef.current, height, segmentValues, min, max, leftColor, rightColor);
    }, [segmentValues, height, leftColor, rightColor, min, max]);

    // Redraw on container resize using ResizeObserver
    useLayoutEffect(() => {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;

      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const newWidth = entry.contentBoxSize?.[0]?.inlineSize ?? entry.contentRect.width;
          if (newWidth === widthRef.current) return;
          widthRef.current = newWidth;
          drawCanvas(canvas, newWidth, height, segmentValues, min, max, leftColor, rightColor);
        }
      });

      observer.observe(container);
      return () => observer.disconnect();
    }, [segmentValues, height, leftColor, rightColor, min, max]);

    const handleDrag = useCallback(
      (e: React.PointerEvent<HTMLCanvasElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const containerWidth = widthRef.current;
        const newValue = min + (x / containerWidth) * (max - min);

        const snappedValue = Math.round(newValue / step) * step;

        if (newValue >= min && newValue <= max) {
          onChange(snappedValue);
        }
      },
      [min, max, step, onChange]
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
