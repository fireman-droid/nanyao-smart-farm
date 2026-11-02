import { useEffect, useState, type ReactNode } from 'react';
import { Alert, App, Button, DatePicker, Form, Input, InputNumber, Modal, Select, Skeleton, Tag } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import { api } from './api';

export const date = (value: string) => dayjs(value).format('YYYY.MM.DD');
export const time = (value: string) => dayjs(value).format('MM-DD HH:mm');
export const kindNames: Record<string, string> = { WATER: '灌溉', FERTILIZE: '施肥', WEED: '除草', INSPECT: '巡检', OTHER: '其他' };
export const kindOptions = Object.entries(kindNames).map(([value, label]) => ({ value, label }));
export function Status({ status }: { status: string }) {
  const values: Record<string, [string, string]> = { GROWING: ['green', '种植中'], HARVESTED: ['default', '已采收'], TODO: ['gold', '待执行'], DONE: ['green', '已完成'], OPEN: ['orange', '待处理'], RESOLVED: ['green', '已处理'] };
  const [color, text] = values[status] ?? ['default', status];
  return <Tag color={color} bordered={false}>{text}</Tag>;
}
export function PageTitle({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <div className="page-title"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div><div className="page-actions">{action}</div></div>;
}
export function DataState({ loading, error, reload, children }: { loading: boolean; error: string; reload: () => void; children: ReactNode }) {
  if (error) return <Alert type="error" showIcon message="数据加载失败" description={error} action={<Button onClick={reload}>重试</Button>} />;
  if (loading) return <div className="panel"><Skeleton active paragraph={{ rows: 8 }} /></div>;
  return <>{children}</>;
}
export function Refresh({ onClick }: { onClick: () => void }) {
  return <Button icon={<ReloadOutlined />} onClick={onClick}>刷新数据</Button>;
}
export interface Field {
  name: string; label: string; type?: 'number' | 'date' | 'datetime-local' | 'textarea' | 'select' | 'password';
  options?: { value: string | number; label: string }[];
  required?: boolean; min?: number; max?: number; maxLength?: number;
}
export function Editor({ title, path, fields, initial, open, onClose, onSaved, method = 'POST', hint }: {
  title: string; path: string; fields: Field[]; initial?: object; open: boolean; onClose: () => void;
  onSaved: () => void; method?: string; hint?: string;
}) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const { message } = App.useApp();
  useEffect(() => {
    if (open) {
      form.resetFields();
      const values = initial as Record<string, unknown> | undefined;
      form.setFieldsValue(Object.fromEntries(fields.map((field) => {
        const value = values?.[field.name];
        return [field.name, value];
      })));
    }
  }, [open, initial, form]); // Fields define a dialog's static schema; opening initializes its values.
  async function save() {
    let values: Record<string, unknown>;
    try { values = await form.validateFields(); } catch { return; }
    setSaving(true);
    try {
      await api(path, { method, data: values });
      message.success('已保存');
      onSaved(); onClose();
    } catch (err) { message.error((err as Error).message); }
    finally { setSaving(false); }
  }
  return <Modal title={title} open={open} onCancel={() => !saving && onClose()} onOk={save} confirmLoading={saving} okText="保存" cancelText="取消" width={640} destroyOnHidden>
    {hint && <Alert type="info" showIcon message={hint} style={{ margin: '16px 0' }} />}
    <Form form={form} layout="vertical" requiredMark="optional">
      <div className="form-grid">{fields.map((field) => <Form.Item className={field.type === 'textarea' ? 'span-full' : ''} key={field.name} name={field.name} label={field.label} {...(field.type === 'date' || field.type === 'datetime-local' ? { getValueProps: (value: string | undefined) => ({ value: value ? dayjs(value) : null }), normalize: (value: Dayjs | null) => field.type === 'date' ? value?.format('YYYY-MM-DD') : value?.toISOString() } : {})} rules={[{ required: field.required !== false, message: `请填写${field.label}` }, ...(field.maxLength ? [{ max: field.maxLength, message: `最多 ${field.maxLength} 字符` }] : [])]}>
        {field.type === 'number' ? <InputNumber min={field.min ?? 0} max={field.max} style={{ width: '100%' }} /> :
          field.type === 'select' ? <Select options={field.options} showSearch optionFilterProp="label" placeholder="请选择" /> :
            field.type === 'textarea' ? <Input.TextArea rows={3} maxLength={field.maxLength ?? 500} showCount /> :
              field.type === 'date' || field.type === 'datetime-local' ? <DatePicker style={{ width: '100%' }} format={field.type === 'date' ? 'YYYY-MM-DD' : 'YYYY-MM-DD HH:mm'} showTime={field.type === 'datetime-local' ? { format: 'HH:mm' } : false} /> :
                <Input type={field.type ?? 'text'} maxLength={field.maxLength} />}
      </Form.Item>)}</div>
    </Form>
  </Modal>;
}
