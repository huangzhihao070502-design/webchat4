import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, User, Settings } from 'lucide-react';
import ChatPage from './chat/ChatPage';
import UserPage from './chat/UserPage';
import SettingsPage from './chat/SettingsPage';

type Tab = 'chat' | 'user' | 'settings';
interface Props { onLogout: () => void }

const tabs = [
  { key: 'chat' as Tab, icon: MessageCircle, label: '聊天' },
  { key: 'user' as Tab, icon: User, label: '用户' },
  { key: 'settings' as Tab, icon: Settings, label: '设置' },
];

export default function Dashboard({ onLogout }: Props) {
  const [tab, setTab] = useState<Tab>('chat');

  return (
    <div style={{
      position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#E8E0D8', fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      {/* Phone frame */}
      <div style={{
        width: '100%', maxWidth: 430, height: '100%', maxHeight: '100vh',
        background: '#F7F3EE', display: 'flex', flexDirection: 'column',
        overflow: 'hidden', boxShadow: '0 25px 50px rgba(0,0,0,0.15)',
      }}>
        {/* Tab content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <AnimatePresence mode="wait">
            {tab === 'chat' && (
              <motion.div key="chat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <ChatPage />
              </motion.div>
            )}
            {tab === 'user' && (
              <motion.div key="user" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ flex: 1, overflow: 'auto' }}>
                <UserPage onStartChat={() => setTab('chat')} />
              </motion.div>
            )}
            {tab === 'settings' && (
              <motion.div key="settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ flex: 1, overflow: 'auto' }}>
                <SettingsPage onLogout={onLogout} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Tab bar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-around',
          borderTop: '1px solid rgba(234,224,213,0.6)', background: 'white',
          padding: '8px 8px calc(env(safe-area-inset-bottom, 8px))', flexShrink: 0,
        }}>
          {tabs.map((t) => {
            const active = tab === t.key;
            return (
              <button key={t.key} onClick={() => setTab(t.key)}
                style={{
                  position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center',
                  gap: 2, padding: '4px 20px', border: 'none', background: 'none', cursor: 'pointer',
                  transition: 'all 0.15s',
                }}>
                <t.icon size={22} strokeWidth={active ? 2 : 1.5} color={active ? '#B08968' : '#8D6E6380'} />
                <span style={{ fontSize: 10, fontWeight: active ? 600 : 400, color: active ? '#B08968' : '#8D6E6380' }}>{t.label}</span>
                {active && <div style={{
                  position: 'absolute', top: -8, height: 3, width: 32, borderRadius: 2,
                  background: 'linear-gradient(135deg, #C89F7E, #B08968)',
                }} />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
