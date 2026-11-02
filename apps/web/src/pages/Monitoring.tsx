import { useState } from 'react';
import { App, Button, Empty, Segmented, Select, Space, Table, Tabs, Tag } from 'antd';
import { AlertOutlined, CloudOutlined, DashboardOutlined, ExperimentOutlined, SunOutlined } from '@ant-design/icons';
import { useSearchParams } from 'react-router-dom';
import { api, useData } from '../api';
import { useUser } from '../auth';
import { EnvironmentChart } from '../Chart';
import type { FarmAlert, MonitorPlot, Reading } from '../types';
import { DataState, Editor, PageTitle, Refresh, Status, time } from '../ui';

export default function Monitoring() {
  const state = useData<MonitorPlot[]>('/monitoring');
  const alerts = useData<FarmAlert[]>('/alerts');
  const admin = useUser().role === 'ADMIN';
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'alerts' ? 'alerts' : 'monitoring';
  const [plotId, setPlotId] = useState<number>();
  const [scenario, setScenario] = useState('NORMAL');
  const [sampling, setSampling] = useState(false);
  const [status, setStatus] = useState('OPEN');
  const [resolving, setResolving] = useState<FarmAlert>();
  const { message } = App.useApp();
  const plot = state.data?.find((p) => p.id === plotId) ?? state.data?.[0];
  const reading = plot?.readings[0];
  const refresh = () => { state.reload(); alerts.reload(); };
  async function sample() {
    if (!plot) return;
    setSampling(true);
    try {
      const result = await api<{ createdAlerts: number }>('/monitoring/simulate', { method: 'POST', data: { plotId: plot.id, scenario } });
      message.success(`模拟采样已入库，新增 ${result.createdAlerts} 条预警`); refresh();
    } catch (err) { message.error((err as Error).message); }
    finally { setSampling(false); }
  }
  return <>
    <PageTitle eyebrow="ENVIRONMENT & ALERTS" title="环境监测" description="观察田间环境变化，及时记录和处理生长风险。" action={<Refresh onClick={refresh} />} />
    <div className="notice-strip"><ExperimentOutlined /><span>课程模拟模式：数据由演示采样生成，未接入真实传感器。预警阈值取自南药档案，仅作功能演示。</span></div>
    <Tabs activeKey={tab} onChange={(key) => setParams({ tab: key })} items={[{ key: 'monitoring', label: '环境采样' }, { key: 'alerts', label: `预警处理 · ${alerts.data?.filter((a) => a.status === 'OPEN').length ?? 0}` }]} />
    {tab === 'monitoring' ? <DataState {...state}>
      <div className="toolbar"><Select aria-label="选择监测地块" value={plot?.id} onChange={setPlotId} options={state.data?.map((p) => ({ value: p.id, label: p.name }))} style={{ minWidth: 230 }} />{admin && <Space wrap><Select aria-label="模拟天气场景" value={scenario} onChange={setScenario} style={{ width: 150 }} options={[{ value: 'NORMAL', label: '常规天气' }, { value: 'DRY', label: '干旱场景' }, { value: 'HOT', label: '高温场景' }]} /><Button type="primary" icon={<ExperimentOutlined />} loading={sampling} disabled={!plot} onClick={sample}>生成模拟采样</Button></Space>}</div>
      {plot ? <>
        <div className="stats-grid sensor-grid">{[
          { label: '空气温度', value: reading?.temperature, unit: '℃', icon: <DashboardOutlined /> },
          { label: '空气湿度', value: reading?.humidity, unit: '%', icon: <CloudOutlined /> },
          { label: '土壤湿度', value: reading?.moisture, unit: '%', icon: <AlertOutlined /> },
          { label: '光照强度', value: reading?.light.toLocaleString(), unit: 'lx', icon: <SunOutlined /> },
        ].map((metric) => <section className="stat-card" key={metric.label}><div className="stat-top"><span>{metric.label}</span><i>{metric.icon}</i></div><div className="stat-value">{metric.value ?? '—'}<small>{metric.unit}</small></div><div className="stat-footer">{reading ? `模拟采样 · ${time(reading.recordedAt)}` : '暂无采样数据'}</div></section>)}</div>
        <section className="panel"><div className="panel-heading"><div><h3>{plot.name} · 环境趋势</h3><p>最近 24 次采样；采样由管理员手动生成，不代表设备实时在线</p></div><Tag bordered={false} color="green">{plot.batches.map((b) => b.herb.name).join(' / ') || '暂无在种南药'}</Tag></div>{plot.readings.length ? <EnvironmentChart readings={plot.readings} /> : <Empty description="暂无采样，管理员可生成第一组模拟数据" />}</section>
        <section className="panel table-panel section-gap"><div className="panel-heading"><div><h3>采样明细</h3><p>保留原始采样记录，最近 24 条</p></div></div><Table<Reading> rowKey="id" dataSource={plot.readings} scroll={{ x: 720 }} pagination={{ pageSize: 6, showSizeChanger: false }} columns={[
          { title: '采样时间', dataIndex: 'recordedAt', render: time }, { title: '空气温度（℃）', dataIndex: 'temperature' },
          { title: '空气湿度（%）', dataIndex: 'humidity' }, { title: '土壤湿度（%）', dataIndex: 'moisture' },
          { title: '光照（lx）', dataIndex: 'light' }, { title: '数据来源', dataIndex: 'simulated', render: (simulated: boolean) => <Tag bordered={false}>{simulated ? '模拟采样' : '设备采样'}</Tag> },
        ]} /></section>
      </> : <Empty description="请先在种植管理中添加地块" />}
    </DataState> : <DataState {...alerts}>
      <div className="toolbar"><Segmented value={status} onChange={setStatus} options={[{ value: 'OPEN', label: '待处理' }, { value: 'RESOLVED', label: '已处理' }, { value: 'ALL', label: '全部预警' }]} /><span className="muted">相同批次、相同指标的未处理预警不会重复生成</span></div>
      <section className="panel table-panel"><Table<FarmAlert> rowKey="id" dataSource={alerts.data?.filter((a) => status === 'ALL' || a.status === status)} scroll={{ x: 1000 }} pagination={{ pageSize: 8, showSizeChanger: false }} columns={[
        { title: '预警信息', dataIndex: 'message', width: 350, render: (text) => <span className="alert-message">{text}</span> },
        { title: '地块 / 批次', render: (_, a) => <div className="table-primary"><strong>{a.batch.plot.name}</strong><span>{a.batch.code}</span></div> },
        { title: '发生时间', dataIndex: 'createdAt', render: time }, { title: '状态', dataIndex: 'status', render: (s) => <Status status={s} /> },
        { title: '操作', render: (_, a) => a.status === 'OPEN' ? <Button type="link" onClick={() => setResolving(a)}>登记处理</Button> : <span className="muted">{a.resolvedAt && time(a.resolvedAt)}</span> },
      ]} expandable={{ expandedRowRender: (a) => <p>处理记录：{a.resolution || '待现场核实并记录处理措施。'}</p> }} /></section>
    </DataState>}
    <Editor title="登记预警处理" open={Boolean(resolving)} path={`/alerts/${resolving?.id}/resolve`} method="PATCH" fields={[{ name: 'resolution', label: '处理措施与现场反馈', type: 'textarea' }]} onClose={() => setResolving(undefined)} onSaved={refresh} hint={resolving?.message} />
  </>;
}
