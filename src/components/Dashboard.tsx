import { useState, useEffect, useCallback } from 'react';
import { MessageCircle, User, Settings } from 'lucide-react';
import ChatPage from './chat/ChatPage';
import UserPage from './chat/UserPage';
import SettingsPage from './chat/SettingsPage';

const API = '';

type Tab = 'chat' | 'user' | 'settings';
interface Props { onLogout: () => void }

const tabs = [
  { key: 'chat' as Tab, icon: MessageCircle, label: '聊天' },
  { key: 'user' as Tab, icon: User, label: '用户' },
  { key: 'settings' as Tab, icon: Settings, label: '设置' },
];

export default function Dashboard({ onLogout }: Props) {
  const [tab, setTab] = useState<Tab>('chat');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  // 所有活跃用户的 ChatPage 实例（同时存活，切换只控制显示隐藏）
  const [activeChatUsers, setActiveChatUsers] = useState<Set<string>>(new Set());

  // 轮询获取用户列表和当前选中用户
  useEffect(() => {
    const t = setInterval(async () => {
      try {
        const r = await fetch(`${API}/api/users`);
        const d = await r.json();
        if (d.current_user) {
          setCurrentUserId(d.current_user);
          setActiveChatUsers(prev => {
            if (prev.has(d.current_user)) return prev;
            return new Set([...prev, d.current_user]);
          });
        } else if (d.users?.length && !currentUserId) {
          const first = d.users[0];
          setCurrentUserId(first);
          setActiveChatUsers(prev => {
            if (prev.has(first)) return prev;
            return new Set([...prev, first]);
          });
        }
        // 新用户自动加入活跃列表
        if (d.users) {
          setActiveChatUsers(prev => {
            let changed = false;
            const next = new Set(prev);
            for (const u of d.users) {
              if (!next.has(u)) { next.add(u); changed = true; }
            }
            return changed ? next : prev;
          });
        }
      } catch {}
    }, 2000);
    return () => clearInterval(t);
  }, []);

  const handleStartChat = useCallback(() => {
    setTab('chat');
  }, []);

  return (
    <div style={{
      position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#E8E0D8', fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      <div style={{
        width: '100%', maxWidth: 430, height: '100%', maxHeight: '100vh',
        background: '#F7F3EE', display: 'flex', flexDirection: 'column',
        overflow: 'hidden', boxShadow: '0 25px 50px rgba(0,0,0,0.15)',
      }}>
        {/* 所有 tab 同时挂载，切换只控制显隐，ChatPage 实例永不销毁 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* ── 聊天 ── */}
          <div style={{
            display: tab === 'chat' ? 'flex' : 'none', flex: 1,
            flexDirection: 'column', overflow: 'hidden', position: 'relative',
          }}>
            {activeChatUsers.size === 0 ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8D6E63', fontSize: 14 }}>
                暂无用户，请先连接微信
              </div>
            ) : Array.from(activeChatUsers).map(uid => (
              <div key={uid} style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column', overflow: 'hidden',
                visibility: uid === currentUserId ? 'visible' : 'hidden',
                pointerEvents: uid === currentUserId ? 'auto' : 'none',
              }}>
                <ChatPage userId={uid} />
              </div>
            ))}
          </div>

          {/* ── 用户管理 ── */}
          <div style={{
            display: tab === 'user' ? 'flex' : 'none', flex: 1,
            overflow: 'auto',
          }}>
            <UserPage onStartChat={handleStartChat} />
          </div>

          {/* ── 设置 ── */}
          <div style={{
            display: tab === 'settings' ? 'flex' : 'none', flex: 1,
            overflow: 'auto',
          }}>
            <SettingsPage onLogout={onLogout} />
          </div>
        </div>

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
