import { useState } from 'react';
import { App, Button, Empty, Input, Popconfirm, Space, Table, Tabs, Tag } from 'antd';
import { DeleteOutlined, EditOutlined, EnvironmentOutlined, PlusOutlined, SearchOutlined, UserOutlined } from '@ant-design/icons';
import { useSearchParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { api, useData } from '../api';
import { useUser } from '../auth';
import type { Batch, Herb, Plot } from '../types';
import { DataState, date, Editor, type Field, PageTitle, Refresh, Status } from '../ui';

const plotFields: Field[] = [
  { name: 'name', label: '地块名称', maxLength: 60 }, { name: 'area', label: '面积（亩）', type: 'number', min: 0.01, max: 100000 },
  { name: 'location', label: '地块位置', maxLength: 160 }, { name: 'soil', label: '土壤类型', maxLength: 60 },
  { name: 'manager', label: '地块负责人', maxLength: 40 },
];
export default function Planting() {
  const plots = useData<Plot[]>('/plots');
  const batches = useData<Batch[]>('/batches');
  const herbs = useData<Herb[]>('/herbs');
  const admin = useUser().role === 'ADMIN';
  const { message } = App.useApp();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'batches' ? 'batches' : 'plots';
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<'plot' | 'batch'>();
  const [editing, setEditing] = useState<Plot | Batch>();
  const [initial, setInitial] = useState<object>();
  const refresh = () => { plots.reload(); batches.reload(); herbs.reload(); };
  const batchFields: Field[] = [
    { name: 'code', label: '批次编号', maxLength: 40 },
    { name: 'herbId', label: '南药品种', type: 'select', options: herbs.data?.map((h) => ({ value: h.id, label: h.name })) },
    { name: 'plotId', label: '种植地块', type: 'select', options: plots.data?.map((p) => ({ value: p.id, label: p.name })) },
    { name: 'quantity', label: '定植数量（株）', type: 'number', min: 1, max: 100000000 },
    { name: 'plantedAt', label: '种植日期', type: 'date' }, { name: 'expectedAt', label: '预计采收日期', type: 'date' },
    { name: 'notes', label: '种植备注', type: 'textarea', required: false },
  ];
  function open(kind: 'plot' | 'batch', record?: Plot | Batch) {
    setEditing(record); setInitial(record ?? (kind === 'batch' ? { code: `NY-${Date.now().toString(36).toUpperCase()}`, plantedAt: dayjs().format('YYYY-MM-DD'), expectedAt: dayjs().add(180, 'day').format('YYYY-MM-DD'), quantity: 1000 } : undefined)); setModal(kind);
  }
  async function remove(kind: string, id: number) {
    try { await api(`/${kind}/${id}`, { method: 'DELETE' }); message.success('已删除'); refresh(); }
    catch (err) { message.error((err as Error).message); }
  }
  const plotList = plots.data?.filter((p) => `${p.name} ${p.location} ${p.manager}`.includes(search));
  const batchList = batches.data?.filter((b) => `${b.code} ${b.herb.name} ${b.plot.name}`.includes(search));
  return <>
    <PageTitle eyebrow="CULTIVATION MANAGEMENT" title="种植管理" description="一块地，一份档案；从定植开始记录每个种植批次。" action={<><Refresh onClick={refresh} />{admin && <Button type="primary" icon={<PlusOutlined />} onClick={() => open(tab === 'plots' ? 'plot' : 'batch')}>{tab === 'plots' ? '新增地块' : '新建种植批次'}</Button>}</>} />
    <Tabs activeKey={tab} onChange={(key) => { setParams({ tab: key }); setSearch(''); }} items={[{ key: 'plots', label: `地块管理 · ${plots.data?.length ?? 0}` }, { key: 'batches', label: `种植批次 · ${batches.data?.length ?? 0}` }]} />
    <div className="toolbar"><Input aria-label="搜索种植记录" placeholder={tab === 'plots' ? '搜索地块名称、位置或负责人' : '搜索批次编号、品种或地块'} prefix={<SearchOutlined />} allowClear value={search} onChange={(e) => setSearch(e.target.value)} style={{ maxWidth: 360 }} /><span className="muted">{tab === 'plots' ? `总面积 ${(plots.data?.reduce((sum, p) => sum + p.area, 0) ?? 0).toFixed(1)} 亩` : '已产生农事或预警记录的批次保留原始关联，不可编辑'}</span></div>
    <DataState loading={plots.loading || batches.loading || herbs.loading} error={plots.error || batches.error || herbs.error} reload={refresh}>
      {tab === 'plots' ? <><div className="plot-grid">{plotList?.map((plot, i) => <article className="panel plot-card" key={plot.id}>
        <div className={`plot-map plot-map-${i % 3}`} aria-hidden="true"><i /><i /><i /><span>{plot.name.split(' · ')[0]}</span></div>
        <div className="plot-card-heading"><h3>{plot.name}</h3><Tag color={plot.batches?.length ? 'green' : 'default'} bordered={false}>{plot.batches?.length ? '种植中' : '空闲地块'}</Tag></div>
        <p className="muted"><EnvironmentOutlined /> {plot.location}</p><div className="plot-facts"><div><strong>{plot.area}<small> 亩</small></strong><span>地块面积</span></div><div><strong>{plot.soil}</strong><span>土壤类型</span></div></div>
        <div className="plot-crops">{plot.batches?.length ? plot.batches.map((b) => <Tag key={b.id}>{b.herb.name}</Tag>) : <span className="muted">暂无在种批次，可安排下一轮种植</span>}</div>
        <div className="plot-bottom"><span className="muted"><UserOutlined /> {plot.manager}</span>{admin && <Space><Button size="small" icon={<EditOutlined />} onClick={() => open('plot', plot)}>编辑</Button><Popconfirm title="删除此地块？" description="有关联批次或采样记录的地块不可删除。" onConfirm={() => remove('plots', plot.id)}><Button size="small" danger aria-label={`删除地块${plot.name}`} icon={<DeleteOutlined />} /></Popconfirm></Space>}</div>
      </article>)}</div>{plotList?.length === 0 && <Empty description="没有匹配的地块，管理员可新增地块" />}</> :
        <section className="panel table-panel"><Table<Batch> rowKey="id" dataSource={batchList} scroll={{ x: 1060 }} pagination={{ pageSize: 8, showSizeChanger: false }} columns={[
          { title: '种植批次', dataIndex: 'code', render: (v, b) => <div className="table-primary"><strong>{b.herb.name}</strong><span>{v}</span></div> },
          { title: '种植地块', render: (_, b) => b.plot.name }, { title: '种植数量', dataIndex: 'quantity', render: (v: number) => `${v.toLocaleString()} 株` },
          { title: '种植日期', dataIndex: 'plantedAt', render: date }, { title: '预计采收', dataIndex: 'expectedAt', render: date },
          { title: '状态', dataIndex: 'status', filters: [{ text: '种植中', value: 'GROWING' }, { text: '已采收', value: 'HARVESTED' }], onFilter: (v, b) => b.status === v, render: (v) => <Status status={v} /> },
          ...(admin ? [{ title: '操作', key: 'actions', render: (_: unknown, b: Batch) => <Space><Button type="link" disabled={b.status === 'HARVESTED'} onClick={() => open('batch', b)}>编辑</Button><Popconfirm title="删除此种植批次？" description="有关联业务记录的批次不可删除。" onConfirm={() => remove('batches', b.id)}><Button type="link" danger disabled={b.status === 'HARVESTED'}>删除</Button></Popconfirm></Space> }] : []),
        ]} expandable={{ expandedRowRender: (b) => <p className="muted">种植备注：{b.notes || '暂无备注'}</p> }} /></section>}
    </DataState>
    <Editor title={`${editing ? '编辑' : '新增'}${modal === 'plot' ? '地块' : '种植批次'}`} open={Boolean(modal)} onClose={() => setModal(undefined)} onSaved={refresh} path={`/${modal === 'plot' ? 'plots' : 'batches'}${editing ? `/${editing.id}` : ''}`} method={editing ? 'PUT' : 'POST'} fields={modal === 'plot' ? plotFields : batchFields} initial={initial} />
  </>;
}
