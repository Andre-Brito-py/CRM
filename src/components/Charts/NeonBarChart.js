import React, { useMemo, useCallback } from 'react';
import { Bar } from '@visx/shape';
import { scaleBand, scaleLinear } from '@visx/scale';
import { GridRows } from '@visx/grid';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { withTooltip, Tooltip, TooltipWithBounds, defaultStyles } from '@visx/tooltip';
import { localPoint } from '@visx/event';
import { max } from 'd3-array';
import { motion } from 'framer-motion';
import ParentSize from '@visx/responsive/lib/components/ParentSize';
import { Group } from '@visx/group';

const tooltipStyles = {
  ...defaultStyles,
  backgroundColor: '#000000',
  color: 'white',
  border: '1px solid rgba(255,255,255,0.1)',
  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
  padding: '12px',
  borderRadius: '12px',
  fontSize: '12px',
  zIndex: 100,
};

function TooltipContainer({ tooltipData, colorContext, formatValue }) {
  if (!tooltipData) return null;
  return (
    <div className="flex flex-col gap-1">
      <div className="text-zinc-400 font-semibold mb-1 uppercase tracking-wider text-[10px]">
        {tooltipData.label}
      </div>
      <div className="flex items-center gap-2">
         <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colorContext || '#8b5cf6' }}></div>
         <div className="text-white text-base font-black">
           {formatValue ? formatValue(tooltipData.value) : tooltipData.value}
         </div>
      </div>
    </div>
  );
}

const NeonBarChartBase = ({
  data,
  width,
  height,
  margin = { top: 20, right: 20, bottom: 40, left: 50 },
  xKey = 'name',
  yKey = 'value',
  color = '#8b5cf6',
  showGrid = true,
  showTooltip = true,
  hideTooltip,
  showTooltipData,
  tooltipData,
  tooltipTop = 0,
  tooltipLeft = 0,
  formatYAxis,
  formatTooltipValue,
}) => {
  if (width < 10) return null;

  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  // Accessors
  const getX = (d) => String(d[xKey] || '');
  const getY = (d) => Number(d[yKey] || 0);

  // Scales
  const xScale = useMemo(
    () =>
      scaleBand({
        range: [0, innerWidth],
        domain: data.map(getX),
        padding: 0.4,
      }),
    [innerWidth, data, xKey]
  );

  const yScale = useMemo(
    () =>
      scaleLinear({
        range: [innerHeight, 0],
        domain: [0, (max(data, getY) || 0) * 1.2],
        nice: true,
      }),
    [innerHeight, data, yKey]
  );

  return (
    <div style={{ position: 'relative' }}>
      <svg width={width} height={height}>
        <defs>
          <filter id="neon-glow-bar" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        <Group top={margin.top} left={margin.left}>
          {showGrid && (
             <GridRows scale={yScale} width={innerWidth} strokeDasharray="3,3" stroke="rgba(255,255,255,0.05)" pointerEvents="none" />
          )}

          <AxisBottom
            top={innerHeight}
            scale={xScale}
            stroke="transparent"
            tickStroke="transparent"
            tickLabelProps={() => ({
              fill: '#71717a',
              fontSize: 10,
              textAnchor: 'middle',
              fontWeight: 600,
            })}
          />

          <AxisLeft
            scale={yScale}
            numTicks={5}
            stroke="transparent"
            tickStroke="transparent"
            tickLabelProps={() => ({
              fill: '#71717a',
              fontSize: 10,
              textAnchor: 'end',
              verticalAnchor: 'middle',
              dx: '-10',
              fontWeight: 600,
            })}
            tickFormat={formatYAxis || ((v) => v)}
          />

          {data.map((d, i) => {
            const letter = getX(d);
            const barWidth = xScale.bandwidth();
            const barHeight = innerHeight - (yScale(getY(d)) ?? 0);
            const barX = xScale(letter);
            const barY = innerHeight - barHeight;
            const delay = i * 0.05;

            return (
              <motion.g
                key={`bar-${letter}-${i}`}
                initial={{ y: innerHeight, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{
                  duration: 0.5,
                  delay,
                  type: 'spring',
                  bounce: 0.3
                }}
              >
                  <Bar
                    x={barX}
                    y={barY}
                    width={barWidth}
                    height={barHeight}
                    fill={color}
                    rx={4}
                    onMouseMove={(event) => {
                      if (!showTooltip) return;
                      const { x, y } = localPoint(event) || { x: 0, y: 0 };
                      showTooltipData({
                        tooltipData: { label: letter, value: getY(d) },
                        tooltipLeft: x,
                        tooltipTop: y,
                      });
                    }}
                    onMouseLeave={() => hideTooltip()}
                    style={{
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                    className="hover:opacity-80 drop-shadow-[0_0_8px_rgba(139,92,246,0.6)]"
                  />
              </motion.g>
            );
          })}
        </Group>
      </svg>

      {tooltipData && showTooltip && (
        <TooltipWithBounds
          top={tooltipTop}
          left={tooltipLeft}
          style={tooltipStyles}
        >
          <TooltipContainer tooltipData={tooltipData} colorContext={color} formatValue={formatTooltipValue} />
        </TooltipWithBounds>
      )}
    </div>
  );
};

const NeonBarChartWithTooltip = withTooltip(NeonBarChartBase);

// Export Responsive Wrapper
export default function NeonBarChart(props) {
  if (!props.data || props.data.length === 0) return <div className="w-full h-full flex items-center justify-center text-zinc-500 text-xs">Sem dados no período</div>;
  
  return (
    <div className="w-full h-full" style={{ minHeight: 250 }}>
      <ParentSize>
        {({ width, height }) => (
          <NeonBarChartWithTooltip width={width} height={height} {...props} />
        )}
      </ParentSize>
    </div>
  );
}
