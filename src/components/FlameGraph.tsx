import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface FlameGraphProps {
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
}

const FlameGraph: React.FC<FlameGraphProps> = ({
  value,
  min,
  max,
  step,
  onChange,
  format = (v) => v.toString(),
  leftColor = 'rgb(59, 130, 246)',
  rightColor = 'rgb(139, 92, 246)',
  label,
  sublabel
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const width = 800;
  const height = 40;
  const segments = 40;

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const scale = d3.scaleLinear()
      .domain([min, max])
      .range([0, width])
      .clamp(true);

    const colorScale = d3.scaleLinear<string>()
      .domain([0, segments / 2, segments])
      .range([leftColor, '#e5e7eb', rightColor]);

    const segmentWidth = width / segments;

    // Create segments
    svg.selectAll('rect')
      .data(Array.from({ length: segments }))
      .enter()
      .append('rect')
      .attr('x', (_, i) => i * segmentWidth)
      .attr('y', 0)
      .attr('width', segmentWidth - 1)
      .attr('height', height)
      .attr('fill', (_, i) => colorScale(i));

    // Add marker
    const marker = svg.append('g')
      .attr('transform', `translate(${scale(value)}, ${height/2})`);

    marker.append('path')
      .attr('d', 'M0,-12 L8,0 L0,12 L-8,0 Z')
      .attr('fill', '#4b5563');

    // Add drag behavior
    const drag = d3.drag<SVGSVGElement, unknown>()
      .on('drag', (event) => {
        const newValue = scale.invert(event.x);
        const snappedValue = Math.round(newValue / step) * step;
        if (snappedValue >= min && snappedValue <= max) {
          onChange(snappedValue);
        }
      });

    svg.call(drag);

  }, [value, min, max, step, leftColor, rightColor]);

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-baseline">
        <div>
          <span className="text-2xl font-normal text-gray-900">{format(value)}</span>
          {sublabel && (
            <div className="text-sm text-gray-500 mt-1">
              {sublabel}
            </div>
          )}
        </div>
        <div className="text-sm text-gray-500">{label}</div>
      </div>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="cursor-pointer"
      />
    </div>
  );
};

export default FlameGraph;