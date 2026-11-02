import { useState } from 'react';
import { App, Button, Descriptions, Drawer, Empty, Input, Popconfirm, Space, Tag } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { api, useData } from '../api';
import { useUser } from '../auth';
import LeafIcon from '../LeafIcon';
import type { Herb } from '../types';
import { DataState, Editor, type Field, PageTitle, Refresh } from '../ui';

const fields: Field[] = [
  { name: 'name', label: '南药名称', maxLength: 60 }, { name: 'scientificName', label: '学名', maxLength: 120 },
  { name: 'family', label: '科属', maxLength: 40 }, { name: 'part', label: '采收部位', maxLength: 60 },
  { name: 'region', label: '主要产区', maxLength: 120 }, { name: 'growthDays', label: '参考生长周期（天）', type: 'number', min: 1, max: 5000 },
  { name: 'tempMin', label: '温度下限（℃）', type: 'number', min: -30, max: 60 }, { name: 'tempMax', label: '温度上限（℃）', type: 'number', min: -30, max: 60 },
  { name: 'moistureMin', label: '土壤湿度下限（%）', type: 'number', max: 100 }, { name: 'moistureMax', label: '土壤湿度上限（%）', type: 'number', max: 100 },
  { name: 'description', label: '种植说明', type: 'textarea', maxLength: 3000 },
];
const defaults = { tempMin: 20, tempMax: 32, moistureMin: 50, moistureMax: 80, growthDays: 180 };
export default function Herbs() {
  const state = useData<Herb[]>('/herbs');
  const admin = useUser().role === 'ADMIN';
  const { message } = App.useApp();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Herb>();
  const [detail, setDetail] = useState<Herb>();
  const records = state.data?.filter((h) => `${h.name} ${h.scientificName} ${h.region} ${h.family}`.toLowerCase().includes(search.toLowerCase()));
  async function remove(id: number) {
    try { await api(`/herbs/${id}`, { method: 'DELETE' }); message.success('档案已删除'); state.reload(); }
    catch (err) { message.error((err as Error).message); }
  }
  return <>
    <PageTitle eyebrow="BOTANICAL ARCHIVE" title="南药档案" description="认识每一味岭南本草，建立品种与种植参考档案。" action={<><Refresh onClick={state.reload} />{admin && <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(undefined); setOpen(true); }}>新增南药</Button>}</>} />
    <div className="toolbar"><Input aria-label="搜索南药" placeholder="搜索南药名称、科属或产区" prefix={<SearchOutlined />} allowClear value={search} onChange={(e) => setSearch(e.target.value)} style={{ maxWidth: 360 }} /><span className="muted">共 {records?.length ?? 0} 种南药 · 种植阈值仅供课程演示</span></div>
    <DataState {...state}><div className="herb-grid">{records?.map((herb, i) => <article className="herb-card" key={herb.id}>
      <div className={`herb-art herb-art-${i % 4}`} aria-hidden="true"><span>{String(i + 1).padStart(2, '0')}</span><LeafIcon /><small>LINGNAN BOTANICAL</small></div>
      <div className="herb-content"><div className="herb-name"><h2>{herb.name}</h2><Tag bordered={false}>{herb.family}</Tag></div><p className="scientific">{herb.scientificName}</p><p className="herb-description">{herb.description}</p>
        <div className="herb-facts"><div><span>采收部位</span><strong>{herb.part}</strong></div><div><span>参考周期</span><strong>{herb.growthDays} 天</strong></div></div>
        <div className="herb-bottom"><Button type="link" onClick={() => setDetail(herb)}>查看档案</Button>{admin && <Space><Button type="text" aria-label={`编辑${herb.name}`} icon={<EditOutlined />} onClick={() => { setEditing(herb); setOpen(true); }} /><Popconfirm title="确认删除此南药档案？" description="已关联种植批次的档案不可删除。" onConfirm={() => remove(herb.id)}><Button type="text" danger aria-label={`删除${herb.name}`} icon={<DeleteOutlined />} /></Popconfirm></Space>}</div>
      </div>
    </article>)}</div>{records?.length === 0 && <Empty description={search ? '没有匹配的南药档案' : '尚未建立南药档案'} />}</DataState>
    <Editor title={editing ? '编辑南药档案' : '新增南药档案'} open={open} onClose={() => setOpen(false)} onSaved={state.reload} path={editing ? `/herbs/${editing.id}` : '/herbs'} method={editing ? 'PUT' : 'POST'} initial={editing ?? defaults} fields={fields} hint="阈值用于演示预警判断，不替代实际农艺指导；下限必须小于上限。" />
    <Drawer title="南药品种档案" open={Boolean(detail)} onClose={() => setDetail(undefined)} width={520}>{detail && <>
      <div className="detail-herb"><LeafIcon /><h2>{detail.name}</h2><p>{detail.scientificName}</p></div><Descriptions bordered column={1} items={[
        { key: 'family', label: '科属', children: detail.family }, { key: 'region', label: '主要产区', children: detail.region },
        { key: 'part', label: '采收部位', children: detail.part }, { key: 'days', label: '参考生长周期', children: `${detail.growthDays} 天` },
        { key: 'temp', label: '参考温度', children: `${detail.tempMin}～${detail.tempMax} ℃` }, { key: 'moisture', label: '参考土壤湿度', children: `${detail.moistureMin}～${detail.moistureMax} %` },
        { key: 'description', label: '种植说明', children: detail.description },
      ]} /><p className="muted" style={{ marginTop: 20 }}>品种信息与阈值用于课程演示，不提供医疗功效或药材安全结论。</p>
    </>}</Drawer>
  </>;
}
