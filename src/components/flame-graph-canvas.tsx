import React, { useCallback, useMemo, useRef, useEffect } from "react";

type SegmentValue = {
  value: number;
  rentingIsBetter: boolean;
};

type FlameGraphCanvasProps = {
  segmentValues: SegmentValue[];
  width: number;
  height: number;
  leftColor: string;
  rightColor: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (val: number) => void;
};

export const FlameGraphCanvas: React.FC<FlameGraphCanvasProps> = ({
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
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const scaleValue = useCallback(
    (val: number) => {
      const domain = max - min;
      return ((val - min) / domain) * width;
    },
    [min, max, width]
  );

  const segmentWidth = useMemo(
    () => Math.max(width / segmentValues.length - 1, 0),
    [segmentValues.length, width]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    ctx.clearRect(0, 0, width, height);

    for (let i = 0, n = segmentValues.length; i < n; ++i) {
      const seg = segmentValues[i];
      const x = scaleValue(seg.value);
      ctx.fillStyle = seg.rentingIsBetter ? leftColor : rightColor;
      ctx.fillRect(x, 0, segmentWidth, height);
    }

    const pointerX = scaleValue(value);
    ctx.fillStyle = "#4b5563"; // the arrow color
    ctx.beginPath();

    const diamondHeight = 25; // Total height of diamond
    const diamondWidth = 20; // Total width of diamond (10 on each side)
    const actualHeight = height;
    const centerY = actualHeight / 2;

    ctx.moveTo(pointerX, centerY - diamondHeight / 2); // top
    ctx.lineTo(pointerX + diamondWidth / 2, centerY); // right
    ctx.lineTo(pointerX, centerY + diamondHeight / 2); // bottom
    ctx.lineTo(pointerX - diamondWidth / 2, centerY); // left
    ctx.closePath();
    ctx.fill();
  }, [
    segmentValues,
    width,
    height,
    leftColor,
    rightColor,
    value,
    segmentWidth,
    scaleValue,
  ]);

  /**
   * We replicate the dragging logic from your <FlameGraphVisualization>.
   * The difference is we attach pointer events to the canvas itself.
   */
  const handleDrag = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const newValue = min + (x / width) * (max - min);

      // Snap to step
      const snappedValue = Math.round(newValue / step) * step;

      // Only call onChange if in range
      if (snappedValue >= min && snappedValue <= max) {
        onChange(snappedValue);
      }
    },
    [min, max, width, step, onChange]
  );

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ cursor: "pointer", width: `${width}px`, height: `${height}px` }}
      onPointerDown={handleDrag}
      onPointerMove={(e) => e.buttons === 1 && handleDrag(e)}
    />
  );
};
