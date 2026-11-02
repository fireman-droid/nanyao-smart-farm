import { lazy, Suspense, useEffect, useState } from 'react';
import { Alert, App as AntApp, Avatar, Button, Drawer, Form, Input, Menu, Skeleton, Tag } from 'antd';
import { AppstoreOutlined, BarChartOutlined, BookOutlined, ExperimentOutlined, FieldTimeOutlined, LogoutOutlined, MenuOutlined, SafetyCertificateOutlined, UserOutlined } from '@ant-design/icons';
import LeafOutlined from './LeafIcon';
import { BrowserRouter, Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { api, useData } from './api';
import { UserContext } from './auth';
import type { User } from './types';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Herbs = lazy(() => import('./pages/Herbs'));
const Planting = lazy(() => import('./pages/Planting'));
const Monitoring = lazy(() => import('./pages/Monitoring'));
const Tasks = lazy(() => import('./pages/Tasks'));
const Harvests = lazy(() => import('./pages/Harvests'));

function Brand() {
  return <div className="brand"><span className="brand-mark"><LeafOutlined /></span><div><strong>南药智耕</strong><small>NANYAO SMART FARM</small></div></div>;
}
function Login({ onLogin }: { onLogin: (token: string) => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  async function login(values: { username: string; password: string }) {
    setLoading(true); setError('');
    try {
      const result = await api<{ token: string; user: User }>('/auth/login', { method: 'POST', data: values });
      sessionStorage.setItem('nanyao-token', result.token); onLogin(result.token);
    } catch (err) { setError((err as Error).message); }
    finally { setLoading(false); }
  }
  return <div className="login-page">
    <section className="login-story">
      <Brand /><div className="story-content"><div className="eyebrow">GROW WITH NATURE. MANAGE WITH DATA.</div><h1>一方沃土，<br />一味好南药。</h1><p>从种下第一株幼苗，到记录每一次收获。<br />让岭南本草的生长，有迹可循。</p><div className="story-pills"><span>种植全程管理</span><span>环境监测预警</span><span>采收批次溯源</span></div></div>
      <div className="terraces" aria-hidden="true"><i /><i /><i /><i /><i /></div>
      <small className="story-footer">岭南本草 · 数字新耕</small>
    </section>
    <section className="login-form">
      <Tag bordered={false} color="green">课程设计 · 本地演示</Tag><h2>欢迎回到南药智耕</h2><p className="muted">登录管理平台，查看基地的每一份生长。</p>
      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 20 }} />}
      <Form layout="vertical" onFinish={login} requiredMark={false} autoComplete="on">
        <Form.Item label="账号" name="username" rules={[{ required: true, message: '请输入账号' }]}><Input prefix={<UserOutlined />} placeholder="请输入账号" autoComplete="username" /></Form.Item>
        <Form.Item label="密码" name="password" rules={[{ required: true, message: '请输入密码' }]}><Input.Password placeholder="请输入密码" autoComplete="current-password" /></Form.Item>
        <Button type="primary" htmlType="submit" block loading={loading}>登录平台</Button>
      </Form>
      <div className="login-help"><SafetyCertificateOutlined /><div>演示账号：admin / farmer<br /><span>初始密码请查看项目中的 .local/演示账号.txt</span></div></div>
      <p className="login-disclaimer">平台中的环境采样与初始业务记录均为模拟演示数据。</p>
    </section>
  </div>;
}
const items = [
  { key: '/dashboard', icon: <AppstoreOutlined />, label: '基地总览' },
  { key: '/herbs', icon: <BookOutlined />, label: '南药档案' },
  { key: '/planting', icon: <span className="anticon"><LeafOutlined /></span>, label: '种植管理' },
  { key: '/monitoring', icon: <BarChartOutlined />, label: '环境监测' },
  { key: '/tasks', icon: <FieldTimeOutlined />, label: '农事管理' },
  { key: '/harvests', icon: <SafetyCertificateOutlined />, label: '采收溯源' },
];
function Shell({ user, logout }: { user: User; logout: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [drawer, setDrawer] = useState(false);
  const nav = <><Brand /><div className="nav-caption">基地工作台</div><Menu selectedKeys={[location.pathname]} items={items} onClick={({ key }) => { navigate(key); setDrawer(false); }} />
    <div className="sidebar-note"><ExperimentOutlined /><strong>每一株，都有生长档案</strong><p>用数据连接土地，<br />让种植管理更有依据。</p><span>演示基地 · 广东肇庆</span></div>
    <div className="sidebar-footer"><span className="status-dot" />本地课程演示系统 <span>v1.0</span></div></>;
  return <UserContext.Provider value={user}><div className="app-shell">
    <aside className="sidebar">{nav}</aside>
    <Drawer open={drawer} onClose={() => setDrawer(false)} placement="left" width={252} styles={{ body: { padding: 20 } }}>{nav}</Drawer>
    <div className="main-column">
      <header className="topbar">
        <div className="topbar-left"><Button className="mobile-menu" aria-label="展开导航" icon={<MenuOutlined />} onClick={() => setDrawer(true)} /><span>工作台 <b>/</b> {items.find((i) => i.key === location.pathname)?.label ?? '基地总览'}</span></div>
        <div className="topbar-right"><Tag bordered={false} color="green" className="demo-tag"><span className="status-dot" />模拟数据模式</Tag><div className="profile"><Avatar style={{ background: '#e8eddf', color: '#486c40' }}>{user.name.slice(0, 1)}</Avatar><span>{user.name}<small>{user.role === 'ADMIN' ? '管理员' : '种植人员'}</small></span></div><Button type="text" aria-label="退出登录" title="退出登录" icon={<LogoutOutlined />} onClick={logout} /></div>
      </header>
      <main className="main-content"><Suspense fallback={<Skeleton active paragraph={{ rows: 12 }} />}><Routes>
        <Route path="/dashboard" element={<Dashboard />} /><Route path="/herbs" element={<Herbs />} />
        <Route path="/planting" element={<Planting />} /><Route path="/monitoring" element={<Monitoring />} />
        <Route path="/tasks" element={<Tasks />} /><Route path="/harvests" element={<Harvests />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes></Suspense></main>
      <footer className="main-footer"><span>南药智耕 · 智慧种植管理平台</span><NavLink to="/monitoring">环境数据为模拟采样，不用于实际生产决策</NavLink></footer>
    </div>
  </div></UserContext.Provider>;
}
export default function App() {
  const [token, setToken] = useState(() => sessionStorage.getItem('nanyao-token'));
  const state = useData<User>(token ? '/auth/me' : null);
  const { message } = AntApp.useApp();
  const logout = () => { sessionStorage.removeItem('nanyao-token'); setToken(null); };
  useEffect(() => {
    const expired = () => { logout(); message.warning('请重新登录'); };
    window.addEventListener('nanyao-logout', expired);
    return () => window.removeEventListener('nanyao-logout', expired);
  }, [message]);
  if (!token) return <Login onLogin={setToken} />;
  if (state.error) return <div className="session-error"><Alert type="error" message="无法连接平台" description={state.error} /><Button onClick={state.reload}>重试连接</Button><Button onClick={logout}>返回登录</Button></div>;
  if (!state.data || state.loading) return <div className="session-error"><Skeleton active paragraph={{ rows: 8 }} /></div>;
  return <BrowserRouter><Shell user={state.data} logout={logout} /></BrowserRouter>;
}
