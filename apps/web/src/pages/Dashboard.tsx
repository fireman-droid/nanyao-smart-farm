import { ArrowRightOutlined, EnvironmentOutlined, FieldTimeOutlined, SafetyCertificateOutlined, WarningOutlined } from '@ant-design/icons';
import LeafOutlined from '../LeafIcon';
import { Button, Empty, Progress, Select, Tag } from 'antd';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { useData } from '../api';
import { Chart, EnvironmentChart } from '../Chart';
import { DataState, date, PageTitle, Refresh, time } from '../ui';
import type { DashboardData, MonitorPlot } from '../types';

export default function Dashboard() {
  const state = useData<DashboardData>('/dashboard');
  const environment = useData<MonitorPlot[]>('/monitoring');
  const [plotId, setPlotId] = useState<number>();
  const navigate = useNavigate();
  const plot = environment.data?.find((p) => p.id === plotId) ?? environment.data?.[0];
  const data = state.data;
  const refresh = () => { state.reload(); environment.reload(); };
  const distribution = Object.entries((data?.batches ?? []).reduce<Record<string, number>>((out, b) => { out[b.herb.name] = (out[b.herb.name] ?? 0) + 1; return out; }, {})).map(([name, value]) => ({ name, value }));
  return <>
    <PageTitle eyebrow="FARM OVERVIEW" title="基地总览" description="把握基地生长脉搏，让每一次耕作有据可依。" action={<><span className="today">{dayjs().format('YYYY年M月D日')}</span><Refresh onClick={refresh} /></>} />
    <DataState {...state}>
      {data && <>
        <section className="welcome-banner"><div><Tag bordered={false}>岭南本草 · 数字新耕</Tag><h2>向下扎根，向上生长。</h2><p>当前有 <strong>{data.stats.growingCount}</strong> 个种植批次正在生长，<strong>{data.stats.taskCount}</strong> 项农事等待执行。</p><Button type="primary" onClick={() => navigate('/tasks')}>查看今日农事 <ArrowRightOutlined /></Button></div><div className="banner-emblem" aria-hidden="true"><LeafOutlined /><span>本草有源 · 生长有数</span></div></section>
        <div className="stats-grid">
          {[
            { label: '种植总面积', value: data.stats.area.toFixed(1), unit: '亩', icon: <EnvironmentOutlined />, footer: `${data.stats.plotCount} 个管理地块`, cls: '' },
            { label: '在种批次', value: data.stats.growingCount, unit: '批', icon: <LeafOutlined />, footer: `${data.stats.herbCount} 种南药已建档`, cls: '' },
            { label: '待执行农事', value: data.stats.taskCount, unit: '项', icon: <FieldTimeOutlined />, footer: `${data.stats.overdueCount} 项已逾期，需关注`, cls: 'amber' },
            { label: '累计采收量', value: data.stats.harvestWeight.toLocaleString(), unit: 'kg', icon: <SafetyCertificateOutlined />, footer: `${data.stats.harvestCount} 个采收批次可溯源`, cls: '' },
          ].map((s) => <section className={`stat-card ${s.cls}`} key={s.label}><div className="stat-top"><span>{s.label}</span><i>{s.icon}</i></div><div className="stat-value">{s.value}<small>{s.unit}</small></div><div className="stat-footer">{s.footer}</div></section>)}
        </div>
        <div className="dashboard-grid">
          <section className="panel"><div className="panel-heading"><div><h3>环境生长曲线 <Tag bordered={false}>模拟采样</Tag></h3><p>最近 24 次采样 · 按地块独立展示</p></div><Select aria-label="选择趋势地块" value={plot?.id} onChange={setPlotId} options={environment.data?.map((p) => ({ value: p.id, label: p.name }))} style={{ width: 190 }} /></div><DataState {...environment}>{plot?.readings.length ? <EnvironmentChart readings={plot.readings} /> : <Empty description="暂无采样，请到环境监测生成一组数据" />}</DataState></section>
          <section className="panel"><div className="panel-heading"><div><h3>在种南药分布</h3><p>按在种批次数统计</p></div><span className="subtle-icon"><LeafOutlined /></span></div>{distribution.length ? <Chart label="各南药品种在种批次数占比" option={{ color: ['#376d50', '#789773', '#abc196', '#d2bc80', '#718887', '#c8d2bf'], tooltip: { trigger: 'item', formatter: '{b}：{c} 批 ({d}%)' }, legend: { bottom: 0, icon: 'circle', itemWidth: 8 }, series: [{ type: 'pie', radius: ['48%', '70%'], center: ['50%', '43%'], label: { show: false }, itemStyle: { borderColor: '#fff', borderWidth: 4, borderRadius: 5 }, data: distribution }], graphic: [{ type: 'text', left: 'center', top: '32%', style: { text: String(data.stats.growingCount), fontSize: 36, fontWeight: 600, fill: '#2b4434' } }, { type: 'text', left: 'center', top: '49%', style: { text: '在种批次', fontSize: 12, fill: '#7a8377' } }] }} /> : <Empty description="暂无在种批次" />}</section>
          <section className="panel"><div className="panel-heading"><div><h3>待办农事 <span className="count-label">{data.stats.taskCount}</span></h3><p>按计划时间排序，优先关注逾期任务</p></div><Button type="link" onClick={() => navigate('/tasks')}>全部农事 <ArrowRightOutlined /></Button></div>{data.tasks.length ? <div className="task-list">{data.tasks.map((task) => <div className="task-row" key={task.id}><div className="task-symbol"><FieldTimeOutlined /></div><div className="task-info"><strong>{task.title}</strong><span>{task.batch.plot.name} · {task.assignee.name}</span></div><div className="task-time"><Tag color={dayjs(task.dueAt).isBefore(dayjs()) ? 'orange' : 'default'} bordered={false}>{dayjs(task.dueAt).isBefore(dayjs()) ? '已逾期' : '待执行'}</Tag><span>{time(task.dueAt)}</span></div></div>)}</div> : <Empty description="农事已全部完成" />}</section>
          <section className="panel alerts-panel"><div className="panel-heading"><div><h3><WarningOutlined /> 基地预警 <span className="count-label warning">{data.stats.alertCount}</span></h3><p>演示阈值检测，需要人工判断处理</p></div></div>{data.alerts.length ? data.alerts.map((a) => <div className="alert-item" key={a.id}><div><span className="alert-dot" /><strong>{a.batch.plot.name}</strong><small>{time(a.createdAt)}</small></div><p>{a.message}</p></div>) : <Empty description="暂无待处理预警" />}<Button block onClick={() => navigate('/monitoring?tab=alerts')}>进入预警处理 <ArrowRightOutlined /></Button></section>
        </div>
        <section className="panel growing-section"><div className="panel-heading"><div><h3>田间生长档案</h3><p>预计周期进度，用于计划参考，不代表实际成熟度</p></div><Button type="link" onClick={() => navigate('/planting?tab=batches')}>管理种植批次 <ArrowRightOutlined /></Button></div><div className="growth-grid">{data.batches.slice(0, 4).map((b) => <div className="growth-card" key={b.id}><div><span className="plant-avatar"><LeafOutlined /></span><Tag bordered={false} color="green">种植中</Tag></div><h4>{b.herb.name}<small>{b.plot.name.split(' · ')[0]}</small></h4><p>{b.code} · {b.quantity.toLocaleString()} 株</p><Progress percent={Math.min(100, Math.max(0, Math.round(dayjs().diff(dayjs(b.plantedAt), 'day') / Math.max(1, dayjs(b.expectedAt).diff(dayjs(b.plantedAt), 'day')) * 100)))} strokeColor="#71906a" size="small" /><span className="muted">预计采收 {date(b.expectedAt)}</span></div>)}</div>{!data.batches.length && <Empty description="添加一个种植批次，开始记录生长" />}</section>
      </>}
    </DataState>
  </>;
}
