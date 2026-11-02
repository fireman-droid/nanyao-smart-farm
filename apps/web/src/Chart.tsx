import { useEffect, useRef } from 'react';
import * as echarts from 'echarts/core';
import { LineChart, PieChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, LegendComponent, GraphicComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import type { EChartsCoreOption, EChartsType } from 'echarts/core';
import type { Reading } from './types';
import dayjs from 'dayjs';

echarts.use([LineChart, PieChart, GridComponent, TooltipComponent, LegendComponent, GraphicComponent, CanvasRenderer]);
export function Chart({ option, height = 280, label }: { option: EChartsCoreOption; height?: number; label: string }) {
  const el = useRef<HTMLDivElement>(null);
  const chartRef = useRef<EChartsType | null>(null);
  const optionKey = JSON.stringify(option);
  useEffect(() => {
    if (!el.current) return;
    const chart = echarts.init(el.current);
    chartRef.current = chart;
    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(el.current);
    return () => { observer.disconnect(); chart.dispose(); chartRef.current = null; };
  }, []);
  useEffect(() => {
    chartRef.current?.setOption(JSON.parse(optionKey) as EChartsCoreOption, { notMerge: true });
  }, [optionKey]);
  return <div ref={el} style={{ height, width: '100%' }} role="img" aria-label={label} />;
}
export function EnvironmentChart({ readings }: { readings: Reading[] }) {
  const list = [...readings].reverse();
  return <Chart label="最近二十四次空气温度与土壤湿度采样趋势图" option={{
    color: ['#317557', '#b99756'],
    tooltip: { trigger: 'axis' },
    legend: { top: 6, right: 12, icon: 'roundRect', itemWidth: 12, itemHeight: 3 },
    grid: { top: 56, left: 46, right: 46, bottom: 28 },
    xAxis: { type: 'category', boundaryGap: false, data: list.map((r) => dayjs(r.recordedAt).format('HH:mm')), axisLine: { lineStyle: { color: '#e5eae5' } }, axisLabel: { color: '#7d897f' } },
    yAxis: [
      { type: 'value', name: '℃', axisLabel: { color: '#7d897f' }, splitLine: { lineStyle: { color: '#f0f2ed' } } },
      { type: 'value', name: '%', min: 0, max: 100, axisLabel: { color: '#7d897f' }, splitLine: { show: false } },
    ],
    series: [
      { name: '空气温度', type: 'line', smooth: true, showSymbol: false, data: list.map((r) => r.temperature), areaStyle: { color: '#edf5ee', opacity: 0.7 }, lineStyle: { width: 2.5 } },
      { name: '土壤湿度', type: 'line', yAxisIndex: 1, smooth: true, showSymbol: false, data: list.map((r) => r.moisture), lineStyle: { width: 2, type: 'dashed' } },
    ],
  }} />;
}
