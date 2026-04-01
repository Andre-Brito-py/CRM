import React, { useMemo, useCallback } from 'react';
import { AreaClosed, LinePath, Bar } from '@visx/shape';
import { scaleTime, scaleLinear, scaleBand } from '@visx/scale';
import { curveMonotoneX } from '@visx/curve';
import { GridRows, GridColumns } from '@visx/grid';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { withTooltip, Tooltip, TooltipWithBounds, defaultStyles } from '@visx/tooltip';
import { localPoint } from '@visx/event';
import { LinearGradient } from '@visx/gradient';
import { max, extent, bisector } from 'd3-array';
import { timeFormat } from 'd3-time-format';
import { motion } from 'framer-motion';
import ParentSize from '@visx/responsive/lib/components/ParentSize';

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

const formatDate = timeFormat("%d %b");

// Tooltip formatter wrapper
function TooltipContainer({ tooltipData, colorContext, formatValue }) {
  if (!tooltipData) return null;
  return (
    <div className="flex flex-col gap-1">
      <div className="text-zinc-400 font-semibold mb-1 uppercase tracking-wider text-[10px]">
        {formatDate(tooltipData.date)}
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

const GlowingAreaChartBase = ({
  data,
  width,
  height,
  margin = { top: 20, right: 20, bottom: 40, left: 50 },
  xKey = 'date',
  yKey = 'value',
  color = '#8b5cf6', // Violet 500
  secondaryColor = '#6366f1', // Indigo 500
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
  const getX = (d) => new Date(d[xKey]);
  const getY = (d) => Number(d[yKey]);

  // Scales
  const xScale = useMemo(
    () =>
      scaleTime({
        range: [0, innerWidth],
        domain: extent(data, getX),
      }),
    [innerWidth, data, xKey]
  );
  const yScale = useMemo(
    () =>
      scaleLinear({
        range: [innerHeight, 0],
        domain: [0, (max(data, getY) || 0) * 1.2], // 20% pading no topo
        nice: true,
      }),
    [innerHeight, data, yKey]
  );

  // Tooltip handler
  const bisectDate = bisector(getX).left;
  const handleTooltip = useCallback(
    (event) => {
      const { x } = localPoint(event) || { x: 0 };
      const x0 = xScale.invert(x - margin.left);
      const index = bisectDate(data, x0, 1);
      const d0 = data[index - 1];
      const d1 = data[index];
      let d = d0;
      if (d1 && getX(d1)) {
        d = x0.valueOf() - getX(d0).valueOf() > getX(d1).valueOf() - x0.valueOf() ? d1 : d0;
      }
      showTooltipData({
        tooltipData: { date: getX(d), value: getY(d) },
        tooltipLeft: x,
        tooltipTop: yScale(getY(d)) + margin.top,
      });
    },
    [showTooltipData, yScale, xScale, data, margin.top, margin.left]
  );

  return (
    <div style={{ position: 'relative' }}>
      <svg width={width} height={height}>
        {/* Glow Filters */}
        <defs>
          <linearGradient id="area-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.6} />
            <stop offset="90%" stopColor={color} stopOpacity={0.0} />
          </linearGradient>
          <filter id="neon-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        <Group top={margin.top} left={margin.left}>
          {showGrid && (
            <>
              <GridRows scale={yScale} width={innerWidth} strokeDasharray="3,3" stroke="rgba(255,255,255,0.05)" pointerEvents="none" />
              <GridColumns scale={xScale} height={innerHeight} strokeDasharray="3,3" stroke="rgba(255,255,255,0.05)" pointerEvents="none" />
            </>
          )}

          <AxisBottom
            top={innerHeight}
            scale={xScale}
            numTicks={width > 520 ? 6 : 3}
            stroke="transparent"
            tickStroke="transparent"
            tickLabelProps={() => ({
              fill: '#71717a',
              fontSize: 10,
              textAnchor: 'middle',
              fontWeight: 600,
            })}
            tickFormat={(v) => timeFormat("%d %b")(v)}
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

          {/* Area Fill */}
          <AreaClosed
              data={data}
              x={(d) => xScale(getX(d))}
              y={(d) => yScale(getY(d))}
              yScale={yScale}
              curve={curveMonotoneX}
          >
           {({ path }) => (
            <motion.path
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              d={path(data) || ''}
              strokeWidth={0}
              fill="url(#area-gradient)"
            />
           )}
          </AreaClosed>

          {/* Glowing Line */}
          <LinePath
                data={data}
                x={(d) => xScale(getX(d))}
                y={(d) => yScale(getY(d))}
                curve={curveMonotoneX}
          >
           {({ path }) => (
             <motion.path
               d={path(data) || ''}
               initial={{ pathLength: 0 }}
               animate={{ pathLength: 1 }}
               transition={{ duration: 1.5, type: "spring", stiffness: 30 }}
               stroke={color}
               strokeWidth={3}
               fill="transparent"
               filter="url(#neon-glow)"
              />
           )}
          </LinePath>

          {/* Hover / Tooltip Interaction Area */}
          {showTooltip && (
            <Bar
              x={0}
              y={0}
              width={innerWidth}
              height={innerHeight}
              fill="transparent"
              rx={14}
              onTouchStart={handleTooltip}
              onTouchMove={handleTooltip}
              onMouseMove={handleTooltip}
              onMouseLeave={() => hideTooltip()}
            />
          )}

          {/* Tooltip Indicator Crosshairs */}
          {tooltipData && showTooltip && (
            <g>
              <line
                x1={tooltipLeft - margin.left}
                y1={0}
                x2={tooltipLeft - margin.left}
                y2={innerHeight}
                stroke={color}
                strokeWidth={2}
                strokeDasharray="4,4"
                pointerEvents="none"
                opacity={0.3}
              />
              <circle
                cx={tooltipLeft - margin.left}
                cy={tooltipTop - margin.top}
                r={6}
                fill="#000"
                stroke={color}
                strokeWidth={3}
                pointerEvents="none"
              />
            </g>
          )}
        </Group>
      </svg>

      {tooltipData && showTooltip && (
        <TooltipWithBounds
          top={tooltipTop - 12}
          left={tooltipLeft + 12}
          style={tooltipStyles}
        >
          <TooltipContainer tooltipData={tooltipData} colorContext={color} formatValue={formatTooltipValue} />
        </TooltipWithBounds>
      )}
    </div>
  );
};

import { Group } from '@visx/group';
const GlowingAreaChartWithTooltip = withTooltip(GlowingAreaChartBase);

// Export Responsive Wrapper
export default function GlowingAreaChart(props) {
  // If no data, render empty
  if (!props.data || props.data.length === 0) return <div className="w-full h-full flex items-center justify-center text-zinc-500 text-xs">Sem dados no período</div>;
  
  return (
    <div className="w-full h-full" style={{ minHeight: 250 }}>
      <ParentSize>
        {({ width, height }) => (
          <GlowingAreaChartWithTooltip width={width} height={height} {...props} />
        )}
      </ParentSize>
    </div>
  );
}
