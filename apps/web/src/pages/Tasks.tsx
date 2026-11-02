import { useState } from 'react';
import { Button, Input, Segmented, Select, Space, Table, Tag } from 'antd';
import { CheckOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useData } from '../api';
import { useUser } from '../auth';
import type { Batch, FarmTask, User } from '../types';
import { DataState, Editor, type Field, kindNames, kindOptions, PageTitle, Refresh, Status, time } from '../ui';

export default function Tasks() {
  const state = useData<FarmTask[]>('/tasks');
  const batches = useData<Batch[]>('/batches');
  const users = useData<User[]>('/auth/users');
  const user = useUser();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('TODO');
  const [kind, setKind] = useState<string | 'ALL'>('ALL');
  const [owner, setOwner] = useState<number | 'ALL'>('ALL');
  const [creating, setCreating] = useState(false);
  const [completing, setCompleting] = useState<FarmTask>();
  const refresh = () => { state.reload(); batches.reload(); users.reload(); };
  const fields: Field[] = [
    { name: 'title', label: '农事名称', maxLength: 100 }, { name: 'kind', label: '作业类型', type: 'select', options: kindOptions },
    { name: 'batchId', label: '种植批次', type: 'select', options: batches.data?.filter((b) => b.status === 'GROWING').map((b) => ({ value: b.id, label: `${b.herb.name} · ${b.code}` })) },
    { name: 'assigneeId', label: '执行人员', type: 'select', options: users.data?.map((u) => ({ value: u.id, label: `${u.name}（${u.username}）` })) },
    { name: 'dueAt', label: '计划完成时间', type: 'datetime-local' },
    { name: 'notes', label: '操作要求', type: 'textarea', required: false },
  ];
  const records = state.data?.filter((t) =>
    (status === 'ALL' || t.status === status)
    && (kind === 'ALL' || t.kind === kind)
    && (owner === 'ALL' || t.assigneeId === owner)
    && `${t.title} ${t.batch.code} ${t.batch.herb.name}`.includes(search));
  const todo = state.data?.filter((t) => t.status === 'TODO') ?? [];
  return <>
    <PageTitle eyebrow="FIELD OPERATIONS" title="农事管理" description="安排每一次田间作业，让执行过程与种植档案相连接。" action={<><Refresh onClick={refresh} />{user.role === 'ADMIN' && <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreating(true)}>安排农事</Button>}</>} />
    <div className="summary-strip"><div><span>待执行任务</span><strong>{todo.length}<small> 项</small></strong></div><div><span>其中已逾期</span><strong className="amber-text">{todo.filter((t) => dayjs(t.dueAt).isBefore(dayjs())).length}<small> 项</small></strong></div><div><span>已完成记录</span><strong>{state.data?.filter((t) => t.status === 'DONE').length ?? 0}<small> 项</small></strong></div><p>完成农事需填写实际操作结果。<br />种植人员只能完成分配给自己的任务。</p></div>
    <div className="toolbar"><Segmented value={status} onChange={setStatus} options={[{ value: 'TODO', label: '待执行' }, { value: 'DONE', label: '已完成' }, { value: 'ALL', label: '全部农事' }]} /><Space wrap>
      <Select aria-label="筛选农事类型" value={kind} onChange={setKind} style={{ width: 140 }} options={[{ value: 'ALL', label: '全部类型' }, ...kindOptions]} />
      <Select aria-label="筛选农事负责人" value={owner} onChange={setOwner} style={{ width: 140 }} options={[{ value: 'ALL', label: '全部负责人' }, { value: user.id, label: '只看我的任务' }]} />
      <Input aria-label="搜索农事" prefix={<SearchOutlined />} placeholder="搜索农事或批次" allowClear value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: 230 }} />
    </Space></div>
    <DataState loading={state.loading || batches.loading || users.loading} error={state.error || batches.error || users.error} reload={refresh}>
      <section className="panel table-panel"><Table<FarmTask> rowKey="id" dataSource={records} scroll={{ x: 1050 }} pagination={{ pageSize: 8, showSizeChanger: false }} columns={[
        { title: '农事任务', render: (_, t) => <div className="table-primary"><strong>{t.title}</strong><span>{t.batch.herb.name} · {t.batch.code}</span></div> },
        { title: '作业类型', dataIndex: 'kind', render: (v) => <Tag bordered={false}>{kindNames[v]}</Tag> },
        { title: '地块', render: (_, t) => t.batch.plot.name }, { title: '执行人', render: (_, t) => t.assignee.name },
        { title: '计划完成', dataIndex: 'dueAt', render: (v, t) => <span className={t.status === 'TODO' && dayjs(v).isBefore(dayjs()) ? 'amber-text' : ''}>{time(v)}{t.status === 'TODO' && dayjs(v).isBefore(dayjs()) && <small className="block">已逾期</small>}</span> },
        { title: '状态', dataIndex: 'status', render: (v) => <Status status={v} /> },
        { title: '操作', render: (_, t) => t.status === 'TODO' ? <Button type="link" icon={<CheckOutlined />} disabled={user.role !== 'ADMIN' && t.assigneeId !== user.id} onClick={() => setCompleting(t)}>完成任务</Button> : <span className="muted">已归档</span> },
      ]} expandable={{ expandedRowRender: (t) => <div className="expanded-notes"><p>操作要求：{t.notes || '暂无额外要求'}</p><p>执行结果：{t.result || '尚未提交'}</p>{t.completedAt && <p>完成时间：{time(t.completedAt)}</p>}</div> }} /></section>
    </DataState>
    <Editor title="安排农事任务" path="/tasks" fields={fields} open={creating} onClose={() => setCreating(false)} onSaved={refresh} hint="仅可为种植中的批次安排农事；所有待办完成后才能登记整批采收。" />
    <Editor title={`完成农事：${completing?.title ?? ''}`} path={`/tasks/${completing?.id}/complete`} method="PATCH" fields={[{ name: 'result', label: '实际操作与完成结果', type: 'textarea' }]} open={Boolean(completing)} onClose={() => setCompleting(undefined)} onSaved={refresh} />
  </>;
}
