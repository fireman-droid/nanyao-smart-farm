import { useState } from 'react';
import { Alert, Button, Descriptions, Drawer, Input, QRCode, Table, Tag, Timeline } from 'antd';
import { PlusOutlined, SafetyCertificateOutlined, SearchOutlined } from '@ant-design/icons';
import { useSearchParams } from 'react-router-dom';
import { useData } from '../api';
import type { Batch, Harvest, Trace } from '../types';
import { DataState, date, Editor, type Field, kindNames, PageTitle, Refresh, time } from '../ui';

export default function Harvests() {
  const state = useData<Harvest[]>('/harvests');
  const batches = useData<Batch[]>('/batches');
  const [params, setParams] = useSearchParams();
  const code = params.get('trace');
  const trace = useData<Trace>(code ? `/trace/${encodeURIComponent(code)}` : null);
  const [lookup, setLookup] = useState('');
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [initial, setInitial] = useState<object>();
  const refresh = () => { state.reload(); batches.reload(); if (code) trace.reload(); };
  const fields: Field[] = [
    { name: 'batchId', label: '采收批次', type: 'select', options: batches.data?.filter((b) => b.status === 'GROWING').map((b) => ({ value: b.id, label: `${b.herb.name} · ${b.code}` })) },
    { name: 'harvestedAt', label: '采收时间', type: 'datetime-local' },
    { name: 'weight', label: '采收重量（kg）', type: 'number', min: 0.01, max: 100000000 },
    { name: 'grade', label: '内部质量分级', maxLength: 30 }, { name: 'destination', label: '采收去向', maxLength: 120 },
    { name: 'notes', label: '采收备注', type: 'textarea', required: false },
  ];
  return <>
    <PageTitle eyebrow="HARVEST & TRACEABILITY" title="采收溯源" description="记录收获的来处，让每一批南药都有完整的生长履历。" action={<><Refresh onClick={refresh} /><Button type="primary" icon={<PlusOutlined />} onClick={() => { setInitial({ harvestedAt: new Date().toISOString() }); setCreating(true); }}>登记采收</Button></>} />
    <section className="trace-search"><div className="trace-search-icon"><SafetyCertificateOutlined /></div><div><h3>一批一码，追溯生长全程</h3><p>输入溯源码，查看品种来源、种植地块、农事记录与采收信息。</p></div><Input.Search aria-label="查询溯源码" placeholder="输入溯源码，例如 NY-DEMO-CXL-001" value={lookup} onChange={(e) => setLookup(e.target.value)} onSearch={(value) => value.trim() && setParams({ trace: value.trim() })} enterButton="查询溯源" /></section>
    <div className="toolbar"><Input aria-label="搜索采收记录" prefix={<SearchOutlined />} placeholder="搜索药材、批次或去向" value={search} onChange={(e) => setSearch(e.target.value)} allowClear style={{ width: 350 }} /><span className="muted">共 {state.data?.length ?? 0} 批采收 · 合计 {(state.data?.reduce((sum, h) => sum + h.weight, 0) ?? 0).toLocaleString()} kg</span></div>
    <DataState loading={state.loading || batches.loading} error={state.error || batches.error} reload={refresh}>
      <section className="panel table-panel"><Table<Harvest> rowKey="id" dataSource={state.data?.filter((h) => `${h.batch.herb.name} ${h.batch.code} ${h.destination}`.includes(search))} scroll={{ x: 1150 }} pagination={{ pageSize: 8, showSizeChanger: false }} columns={[
        { title: '南药 / 批次', render: (_, h) => <div className="table-primary"><strong>{h.batch.herb.name}</strong><span>{h.batch.code}</span></div> },
        { title: '采收地块', render: (_, h) => h.batch.plot.name }, { title: '采收时间', dataIndex: 'harvestedAt', render: time },
        { title: '采收重量', dataIndex: 'weight', render: (v: number) => <strong>{v.toLocaleString()} kg</strong> },
        { title: '内部分级', dataIndex: 'grade', render: (v) => <Tag bordered={false}>{v}</Tag> },
        { title: '采收去向', dataIndex: 'destination' }, { title: '登记人', render: (_, h) => h.operator.name },
        { title: '溯源档案', render: (_, h) => <Button type="link" icon={<SafetyCertificateOutlined />} onClick={() => setParams({ trace: h.traceCode })}>查看溯源</Button> },
      ]} /></section>
    </DataState>
    <Editor title="登记整批采收" path="/harvests" fields={fields} initial={initial} open={creating} onClose={() => setCreating(false)} onSaved={refresh} hint="一次登记代表整个批次采收结束。请先完成全部待办农事；采收时间不能早于最后一次农事完成时间，保存后不可重复采收。" />
    <Drawer title="南药生长溯源档案" width={640} open={Boolean(code)} onClose={() => setParams({})}>
      <DataState {...trace}>{trace.data && <>
        <div className="trace-head"><div><Tag bordered={false} color="green">内部种植履历</Tag><h2>{trace.data.harvest.batch.herb.name}</h2><p>{trace.data.harvest.batch.herb.scientificName}</p><code>{trace.data.harvest.traceCode}</code></div><QRCode size={112} value={`${window.location.origin}/harvests?trace=${encodeURIComponent(trace.data.harvest.traceCode)}`} color="#2d684c" /></div>
        <p className="muted">二维码为内部溯源链接，需登录平台；本地链接仅在当前电脑可用。</p>
        <Descriptions title="采收信息" bordered size="small" column={2} items={[
          { key: 'batch', label: '种植批次', children: trace.data.harvest.batch.code, span: 2 },
          { key: 'plot', label: '种植地块', children: trace.data.harvest.batch.plot.name, span: 2 },
          { key: 'location', label: '基地位置', children: trace.data.harvest.batch.plot.location, span: 2 },
          { key: 'weight', label: '采收重量', children: `${trace.data.harvest.weight} kg` },
          { key: 'grade', label: '内部分级', children: trace.data.harvest.grade },
          { key: 'destination', label: '采收去向', children: trace.data.harvest.destination, span: 2 },
          { key: 'notes', label: '备注', children: trace.data.harvest.notes || '暂无', span: 2 },
        ]} />
        <h3 className="section-title">从种植到采收</h3>
        <Timeline items={[
          { color: '#2d684c', children: <><strong>定植建档</strong><p>{date(trace.data.harvest.batch.plantedAt)} · 定植 {trace.data.harvest.batch.quantity.toLocaleString()} 株</p></> },
          ...trace.data.tasks.map((task) => ({ color: '#8fa785', children: <><strong>{kindNames[task.kind]} · {task.title}</strong><p>{task.completedAt && time(task.completedAt)} · {task.assignee.name}</p><p className="muted">{task.result}</p></> })),
          { color: '#2d684c', children: <><strong>采收归档</strong><p>{time(trace.data.harvest.harvestedAt)} · {trace.data.harvest.operator.name} · {trace.data.harvest.weight} kg</p></> },
        ]} />
        <div className="notice-strip">种植至采收期间留存 {trace.data.readings.length} 条地块采样，其中 {trace.data.readings.filter((r) => r.simulated).length} 条为模拟数据。</div>
        <Alert message={trace.data.disclaimer} type="warning" showIcon />
      </>}</DataState>
    </Drawer>
  </>;
}
