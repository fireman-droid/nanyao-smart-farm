import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App as AntApp, ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import 'antd/dist/reset.css';
import App from './App';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider locale={zhCN} theme={{ token: {
      colorPrimary: '#2d684c', colorInfo: '#2d684c', colorSuccess: '#2d684c',
      colorText: '#273b30', colorTextSecondary: '#647267', colorBorder: '#e1e7de',
      colorBgLayout: '#f5f6f1', borderRadius: 8, controlHeight: 40, fontSize: 14,
      fontFamily: '"Segoe UI", "Microsoft YaHei", sans-serif',
    }, components: { Table: { headerBg: '#f7f8f4', headerColor: '#5f6e60', cellPaddingBlock: 16 }, Menu: { itemSelectedBg: '#eaf0e7', itemSelectedColor: '#245d43', itemHeight: 48 }, Button: { primaryShadow: 'none' } } }}>
      <AntApp><App /></AntApp>
    </ConfigProvider>
  </StrictMode>,
);
