import { useState, useEffect, useCallback } from 'react';
import { Shield, Bell, Lock, Sliders, Info, LogOut, ChevronRight, ArrowLeft, AlertTriangle, MessageSquare, Check, X, Loader, Edit3, Trash2, BookOpen } from 'lucide-react';

interface Props { onLogout: () => void }

const API = '';

export default function SettingsPage({ onLogout }: Props) {
  const [email, setEmail] = useState('');
  const [page, setPage] = useState<'main' | 'account' | 'ai' | 'personas' | 'personaEdit' | 'logs'>('main');
  const [personas, setPersonas] = useState<any[]>([]);
  const [personaMap, setPersonaMap] = useState<Record<string,string>>({});
  const [editingPersona, setEditingPersona] = useState<any>({ name: '', personality: '', style: '', background: '', details: '' });
  const [users, setUsers] = useState<string[]>([]);
  const [expandedPersona, setExpandedPersona] = useState<string|null>(null);
  const [allSkills, setAllSkills] = useState<any[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [aiCfg, setAiCfg] = useState({ enabled: false, api_url: '', api_key: '', model: '', prompt: '', scheduled_reply: false, active_interval: 60, max_replies: 2, reply_min_chars: 0, reply_max_chars: 0, token_limit: 0 });
  const [aiTestResult, setAiTestResult] = useState<string|null>(null);
  const [aiTesting, setAiTesting] = useState(false);
  const [aiSaved, setAiSaved] = useState(false);

  useEffect(() => {
    try {
      const s = localStorage.getItem('aperture_session');
      if (s) { const d = JSON.parse(s); if (d.email) setEmail(d.email); }
    } catch {}
  }, []);

  // Load personas
  const loadPersonas = useCallback(async () => {
    try { const r = await fetch(`${API}/api/personas`); const d = await r.json(); if (d.personas) setPersonas(d.personas); if (d.user_map) setPersonaMap(d.user_map); } catch {}
  }, []);
  useEffect(() => { if (page === 'personas') { loadPersonas(); fetch(`${API}/api/users`).then(r=>r.json()).then(d => { if(d.users) setUsers(d.users); }).catch(()=>{}); fetch(`${API}/api/skills`).then(r=>r.json()).then(d => { if(d.skills) setAllSkills(d.skills); }).catch(()=>{}); } }, [page, loadPersonas]);

  // Load skills for personaEdit
  useEffect(() => {
    if (page !== 'personaEdit') return;
    fetch(`${API}/api/skills`).then(r => r.json()).then(d => {
      if (d.skills) {
        setAllSkills(d.skills);
        setSelectedSkills(
          editingPersona.id && editingPersona.skills?.length > 0
            ? editingPersona.skills
            : d.skills.map((s: any) => s.id)
        );
      }
    }).catch(() => {});
  }, [page]);

  // Load AI config
  useEffect(() => {
    if (page === 'ai') {
      fetch(`${API}/api/ai-config`).then(r => r.json()).then(d => { if (d && typeof d === 'object') setAiCfg({ enabled: d.enabled||false, api_url: d.api_url||'', api_key: d.api_key||'', model: d.model||'', prompt: d.prompt||'', scheduled_reply: d.scheduled_reply||false, active_interval: d.active_interval||60, max_replies: d.max_replies||2, reply_min_chars: d.reply_min_chars||0, reply_max_chars: d.reply_max_chars||0, token_limit: d.token_limit||0 }); }).catch(() => {});
    }
  }, [page]);

  const handleSaveAi = useCallback(async () => {
    try { await fetch(`${API}/api/ai-config`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(aiCfg) }); setAiSaved(true); setTimeout(() => setAiSaved(false), 2000); } catch {}
  }, [aiCfg]);

  const handleTestAi = useCallback(async () => {
    setAiTesting(true); setAiTestResult(null);
    try {
      const r = await fetch(`${API}/api/ai-test`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ api_url: aiCfg.api_url, api_key: aiCfg.api_key, model: aiCfg.model }) });
      const d = await r.json();
      setAiTestResult(d.success ? `✅ 连接成功！回复：${d.reply}` : `❌ ${d.error}`);
    } catch { setAiTestResult('❌ 测试失败'); }
    setAiTesting(false);
  }, [aiCfg]);

  const handleDeleteAccount = () => {
    if (!confirm('确认注销账号？\n\n注销后账号数据将被清除，不可恢复。')) return;
    if (!confirm('再次确认：真的要注销吗？')) return;
    try { localStorage.removeItem('aperture_auth'); localStorage.removeItem('aperture_session'); } catch {}
    onLogout();
  };

  // AI Auto-reply page
  if (page === 'ai') {
    return (
      <div style={{ display:'flex', flexDirection:'column', height:'100%', padding:'32px 20px 20px', background:'#F7F3EE', overflow:'auto' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
          <button onClick={() => setPage('main')} style={{ width:32, height:32, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:10, border:'none', background:'none', cursor:'pointer', color:'#8D6E63' }}>
            <ArrowLeft size={20} strokeWidth={1.5} />
          </button>
          <h1 style={{ fontSize:20, fontWeight:600, color:'#3E2723' }}>AI 自动回复</h1>
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 16px', borderRadius:14, background:'white', marginBottom:16, cursor:'pointer' }} onClick={() => setAiCfg(p => ({...p, enabled: !p.enabled}))}>
          <div style={{ width:44, height:26, borderRadius:13, background: aiCfg.enabled ? 'linear-gradient(135deg,#10b981,#059669)' : '#d1d5db', position:'relative', transition:'all 0.2s', flexShrink:0 }}>
            <div style={{ width:22, height:22, borderRadius:'50%', background:'white', position:'absolute', top:2, left: aiCfg.enabled ? 20 : 2, transition:'all 0.2s', boxShadow:'0 1px 3px rgba(0,0,0,0.15)' }} />
          </div>
          <span style={{ fontSize:14, fontWeight:500, color:'#3E2723' }}>启用 AI 自动回复</span>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:14, background:'white', borderRadius:16, padding:'16px', marginBottom:16 }}>
          <div>
            <label style={{ fontSize:12, fontWeight:500, color:'#8D6E63', marginBottom:4, display:'block' }}>API 地址</label>
            <input value={aiCfg.api_url} onChange={e => setAiCfg(p => ({...p, api_url: e.target.value}))} placeholder="https://api.deepseek.com/v1" style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:'1px solid rgba(234,224,213,0.6)', fontSize:13, outline:'none', color:'#3E2723', background:'#F7F3EE', boxSizing:'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize:12, fontWeight:500, color:'#8D6E63', marginBottom:4, display:'block' }}>API 密钥</label>
            <input value={aiCfg.api_key} onChange={e => setAiCfg(p => ({...p, api_key: e.target.value}))} type="password" placeholder="sk-xxxxxxxxxxxx" style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:'1px solid rgba(234,224,213,0.6)', fontSize:13, outline:'none', color:'#3E2723', background:'#F7F3EE', boxSizing:'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize:12, fontWeight:500, color:'#8D6E63', marginBottom:4, display:'block' }}>模型</label>
            <input value={aiCfg.model} onChange={e => setAiCfg(p => ({...p, model: e.target.value}))} placeholder="deepseek-chat / gpt-4o / claude-3-opus" style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:'1px solid rgba(234,224,213,0.6)', fontSize:13, outline:'none', color:'#3E2723', background:'#F7F3EE', boxSizing:'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize:12, fontWeight:500, color:'#8D6E63', marginBottom:4, display:'block' }}>提示词（设定 AI 行为和规则）</label>
            <textarea value={aiCfg.prompt} onChange={e => setAiCfg(p => ({...p, prompt: e.target.value}))} placeholder="你是一个热情的微信聊天助手，请用自然的中文回复。&#10;规则：&#10;1. 回复简短，不超过50字&#10;2. 使用表情符号&#10;3. 称呼用户为'亲'" rows={5} style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:'1px solid rgba(234,224,213,0.6)', fontSize:13, outline:'none', color:'#3E2723', background:'#F7F3EE', boxSizing:'border-box', resize:'vertical', fontFamily:'inherit' }} />
          </div>
          <div>
            <label style={{ fontSize:12, fontWeight:500, color:'#8D6E63', marginBottom:4, display:'block' }}>每条消息最多回复条数</label>
            <div style={{ display:'flex', gap:8 }}>
              {[1,2,3,4,5].map(n => (
                <button key={n} onClick={() => setAiCfg(p => ({...p, max_replies: n}))}
                  style={{ width:40, height:36, borderRadius:10, border: aiCfg.max_replies === n ? '2px solid #C89F7E' : '1px solid rgba(234,224,213,0.6)', background: aiCfg.max_replies === n ? 'rgba(200,159,126,0.1)' : '#F7F3EE', color: aiCfg.max_replies === n ? '#C89F7E' : '#8D6E63', fontSize:14, fontWeight: aiCfg.max_replies === n ? 600 : 400, cursor:'pointer' }}>
                  {n}
                </button>
              ))}
              <span style={{ fontSize:12, color:'#8D6E63', display:'flex', alignItems:'center', marginLeft:4 }}>条</span>
            </div>
          </div>

          {/* 字数限制 */}
          <div>
            <label style={{ fontSize:12, fontWeight:500, color:'#8D6E63', marginBottom:6, display:'block' }}>回复字数限制（0 为不限制）</label>
            <div style={{ display:'flex', gap:10, alignItems:'center' }}>
              <input type="number" min="0" max="10000" value={aiCfg.reply_min_chars} onChange={e => setAiCfg(p => ({...p, reply_min_chars: Math.max(0, parseInt(e.target.value) || 0)}))}
                style={{ width:80, padding:'8px 10px', borderRadius:10, border:'1px solid rgba(234,224,213,0.6)', fontSize:13, outline:'none', color:'#3E2723', background:'#F7F3EE', textAlign:'center', boxSizing:'border-box' }} />
              <span style={{ fontSize:13, color:'#8D6E63' }}>~</span>
              <input type="number" min="0" max="10000" value={aiCfg.reply_max_chars} onChange={e => setAiCfg(p => ({...p, reply_max_chars: Math.max(0, parseInt(e.target.value) || 0)}))}
                style={{ width:80, padding:'8px 10px', borderRadius:10, border:'1px solid rgba(234,224,213,0.6)', fontSize:13, outline:'none', color:'#3E2723', background:'#F7F3EE', textAlign:'center', boxSizing:'border-box' }} />
              <span style={{ fontSize:13, color:'#8D6E63' }}>字</span>
            </div>
            <p style={{ fontSize:11, color:'#8D6E6380', margin:'4px 0 0', lineHeight:1.4 }}>设置后 AI 回复会尽量控制在指定字数范围内，先保存再生效。</p>
          </div>

          {/* Token 限制滑动器 */}
          <div>
            <label style={{ fontSize:12, fontWeight:500, color:'#8D6E63', marginBottom:6, display:'block' }}>
              Token 消耗限制
            </label>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <input type="range" min="0" max="8192" step="256"
                value={aiCfg.token_limit}
                onChange={e => setAiCfg(p => ({...p, token_limit: parseInt(e.target.value)}))}
                style={{ flex:1, height:6, borderRadius:3, appearance:'none', background: aiCfg.token_limit > 0 ? 'linear-gradient(90deg, #10b981, #f59e0b, #ef4444)' : '#d1d5db', outline:'none', cursor:'pointer' }} />
              <span style={{ fontSize:13, fontWeight:600, color:'#3E2723', minWidth:70, textAlign:'center', whiteSpace:'nowrap' }}>
                {aiCfg.token_limit === 0 ? '无限制' : aiCfg.token_limit >= 1000 ? `${(aiCfg.token_limit/1000).toFixed(1)}k` : `${aiCfg.token_limit}`}
              </span>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', marginTop:2, padding:'0 2px' }}>
              <span style={{ fontSize:10, color:'#10b981' }}>无限制</span>
              <span style={{ fontSize:10, color:'#f59e0b' }}>512</span>
              <span style={{ fontSize:10, color:'#ef4444' }}>8k</span>
            </div>
            <p style={{ fontSize:11, color:'#8D6E6380', margin:'4px 0 0', lineHeight:1.4 }}>
              {aiCfg.token_limit === 0
                ? '无限制：AI 可根据内容自由消耗 Token，不受上限约束。'
                : `限制每次 API 调用最多消耗 ${aiCfg.token_limit} Tokens，超出部分将被截断。`}
            </p>
          </div>
        </div>

        {/* Scheduled reply */}
        <div style={{ display:'flex', flexDirection:'column', gap:10, background:'white', borderRadius:16, padding:'16px', marginBottom:16 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12, cursor:'pointer' }} onClick={() => setAiCfg(p => ({...p, scheduled_reply: !p.scheduled_reply}))}>
            <div style={{ width:44, height:26, borderRadius:13, background: aiCfg.scheduled_reply ? 'linear-gradient(135deg,#10b981,#059669)' : '#d1d5db', position:'relative', transition:'all 0.2s', flexShrink:0 }}>
              <div style={{ width:22, height:22, borderRadius:'50%', background:'white', position:'absolute', top:2, left: aiCfg.scheduled_reply ? 20 : 2, transition:'all 0.2s', boxShadow:'0 1px 3px rgba(0,0,0,0.15)' }} />
            </div>
            <span style={{ fontSize:14, fontWeight:500, color:'#3E2723' }}>定时主动发送消息</span>
          </div>
          {aiCfg.scheduled_reply && (
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ fontSize:13, color:'#8D6E63', whiteSpace:'nowrap' }}>每隔</span>
              <input type="number" min="1" max="1440" value={aiCfg.active_interval} onChange={e => setAiCfg(p => ({...p, active_interval: Math.max(1, parseInt(e.target.value) || 60)}))}
                style={{ width:70, padding:'8px 10px', borderRadius:10, border:'1px solid rgba(234,224,213,0.6)', fontSize:13, outline:'none', color:'#3E2723', background:'#F7F3EE', textAlign:'center' }} />
              <span style={{ fontSize:13, color:'#8D6E63' }}>分钟</span>
            </div>
          )}
          {aiCfg.scheduled_reply && <p style={{ fontSize:11, color:'#8D6E6380', margin:0, lineHeight:1.4 }}>AI 将按照设定的时间间隔，主动向每个用户发送问候消息。仅在 AI 自动回复启用时生效。</p>}
        </div>

        <div style={{ display:'flex', gap:10, marginBottom:12 }}>
          <button onClick={handleSaveAi} style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'12px', borderRadius:12, border:'none', background:'linear-gradient(135deg,#C89F7E,#B08968)', color:'white', fontSize:13, fontWeight:500, cursor:'pointer' }}>
            {aiSaved ? <><Check size={16} strokeWidth={2}/> 已保存</> : '保存配置'}
          </button>
          <button onClick={handleTestAi} disabled={aiTesting || !aiCfg.api_url || !aiCfg.api_key} style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'12px', borderRadius:12, border:'1px solid rgba(200,159,126,0.3)', background:'white', color:'#C89F7E', fontSize:13, fontWeight:500, cursor:'pointer', opacity: (aiTesting || !aiCfg.api_url || !aiCfg.api_key) ? 0.5 : 1 }}>
            {aiTesting ? <><Loader size={16} strokeWidth={2} className="animate-spin"/> 测试中...</> : '测试连接'}
          </button>
        </div>
        {aiTestResult && <div style={{ padding:'10px 14px', borderRadius:12, background:'white', fontSize:12, color:'#3E2723', lineHeight:1.5 }}>{aiTestResult}</div>}
      </div>
    );
  }

  // Persona list page
  if (page === 'personas') {
    return (
      <div style={{ display:'flex', flexDirection:'column', height:'100%', padding:'32px 20px 20px', background:'#F7F3EE', overflow:'auto' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <button onClick={() => setPage('main')} style={{ width:32, height:32, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:10, border:'none', background:'none', cursor:'pointer', color:'#8D6E63' }}>
              <ArrowLeft size={20} strokeWidth={1.5} />
            </button>
            <h1 style={{ fontSize:20, fontWeight:600, color:'#3E2723' }}>角色卡 ({personas.length})</h1>
          </div>
          <button onClick={() => { setEditingPersona({ name:'', personality:'', style:'', background:'', details:'' }); setPage('personaEdit'); }}
            style={{ width:36, height:36, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:12, border:'none', background:'linear-gradient(135deg,#C89F7E,#B08968)', color:'white', cursor:'pointer' }}>+</button>
        </div>
        {personas.length === 0 ? (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'60%', textAlign:'center' }}>
            <BookOpen size={48} strokeWidth={1} color="#8D6E6340" />
            <p style={{ marginTop:12, fontSize:14, color:'#8D6E63' }}>暂无角色卡</p>
            <p style={{ marginTop:4, fontSize:12, color:'#8D6E6380' }}>点击右上角 + 创建角色卡</p>
          </div>
        ) : personas.map(p => {
          const isExpanded = expandedPersona === p.id;
          const assignedUserId = Object.entries(personaMap).find(([,pid]) => pid === p.id)?.[0] || '';
          return (<div key={p.id}>
          <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px', borderRadius:14, background:'white', marginBottom: isExpanded ? 0 : 8 }}>
            <div style={{ width:44, height:44, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontSize:16, fontWeight:600, background:'linear-gradient(135deg,#C89F7E,#B08968)', flexShrink:0 }}>
              {p.name ? p.name[0].toUpperCase() : '?'}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:14, fontWeight:600, color:'#3E2723' }}>{p.name || '未命名'}</div>
              <div style={{ fontSize:12, color:'#8D6E63', marginTop:2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{p.personality || p.background || '无描述'}</div>
              {assignedUserId && <div style={{ fontSize:11, color:'#10b981', marginTop:2 }}>已分配给: {assignedUserId.slice(0,12)}...</div>}
              {p.skills && p.skills.length > 0 && (
                <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginTop:4 }}>
                  {p.skills.map((sid: string) => {
                    const skill = allSkills.find((s: any) => s.id === sid);
                    return skill ? (
                      <span key={sid} style={{ fontSize:10, padding:'1px 7px', borderRadius:4, background:'rgba(200,159,126,0.1)', color:'#C89F7E', fontWeight:500 }}>
                        {skill.name}
                      </span>
                    ) : null;
                  })}
                </div>
              )}
            </div>
            <button onClick={() => { setEditingPersona(p); setPage('personaEdit'); }} style={{ width:32, height:32, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:10, border:'none', background:'rgba(200,159,126,0.1)', color:'#C89F7E', cursor:'pointer' }}>
              <Edit3 size={14} strokeWidth={1.5} />
            </button>
            <button onClick={async () => { if (confirm('删除角色卡「'+p.name+'」？')) { await fetch(`${API}/api/personas/delete`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({id:p.id}) }); loadPersonas(); } }} style={{ width:32, height:32, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:10, border:'none', background:'rgba(239,68,68,0.08)', color:'#ef4444', cursor:'pointer' }}>
              <Trash2 size={14} strokeWidth={1.5} />
            </button>
            <button onClick={() => setExpandedPersona(isExpanded ? null : p.id)} style={{ width:32, height:32, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:10, border:'none', background:'rgba(200,159,126,0.1)', color:'#8D6E63', cursor:'pointer', fontSize:11, fontWeight:600 }}>
              管理
            </button>
          </div>
          {isExpanded && (
            <div style={{ padding:'12px 14px', marginBottom:8, borderRadius:'0 0 14px 14px', background:'rgba(247,243,238,0.8)', borderTop:'1px solid rgba(234,224,213,0.3)' }}>
              <div style={{ fontSize:12, fontWeight:500, color:'#8D6E63', marginBottom:8 }}>选择要分配的用户：</div>
              {users.length === 0 ? (
                <div style={{ fontSize:12, color:'#8D6E63', padding:'10px 0' }}>暂无用户，请先扫码连接微信</div>
              ) : users.map(uid => {
                const isAssigned = personaMap[uid] === p.id;
                return (
                  <div key={uid} onClick={async () => {
                    const newMap = {...personaMap};
                    if (isAssigned) { delete newMap[uid]; }
                    else {
                      for (const u of Object.keys(newMap)) { if (newMap[u] === p.id) delete newMap[u]; }
                      newMap[uid] = p.id;
                    }
                    await fetch(`${API}/api/personas/assign`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({user_id: uid, persona_id: isAssigned ? '' : p.id}) });
                    setPersonaMap(newMap);
                  }} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:10, cursor:'pointer', marginBottom:4, background: isAssigned ? 'rgba(200,159,126,0.12)' : 'white', border: isAssigned ? '1px solid rgba(200,159,126,0.25)' : '1px solid transparent' }}>
                    <div style={{ width:36, height:36, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontSize:13, fontWeight:600, background:'linear-gradient(135deg,#C89F7E,#B08968)', flexShrink:0 }}>
                      {uid.slice(0,2).toUpperCase()}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:500, color:'#3E2723' }}>{uid.slice(0,12)}...</div>
                      <div style={{ fontSize:10, color:'#8D6E63' }}>{uid}</div>
                    </div>
                    {isAssigned && <span style={{ fontSize:10, padding:'2px 8px', borderRadius:999, background:'rgba(200,159,126,0.15)', color:'#C89F7E', fontWeight:500 }}>已分配</span>}
                  </div>
                );
              })}
            </div>
          )}
          </div>);
        })}
      </div>
    );
  }

  // Persona edit page
  if (page === 'personaEdit') {
    return (
      <div style={{ display:'flex', flexDirection:'column', height:'100%', padding:'32px 20px 20px', background:'#F7F3EE', overflow:'auto' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
          <button onClick={() => setPage('personas')} style={{ width:32, height:32, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:10, border:'none', background:'none', cursor:'pointer', color:'#8D6E63' }}>
            <ArrowLeft size={20} strokeWidth={1.5} />
          </button>
          <h1 style={{ fontSize:20, fontWeight:600, color:'#3E2723' }}>{editingPersona.id ? '编辑角色卡' : '创建角色卡'}</h1>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:14, background:'white', borderRadius:16, padding:'16px', marginBottom:16 }}>
          {[{ key:'name', label:'名称', placeholder:'例：小暖' },
            { key:'personality', label:'性格', placeholder:'例：温柔、善解人意、有点小调皮' },
            { key:'style', label:'做事风格', placeholder:'例：耐心倾听，给予建议，偶尔开玩笑' },
            { key:'background', label:'背景故事', placeholder:'例：是一名心理咨询师，喜欢在咖啡厅看书' },
            { key:'details', label:'其他设定', placeholder:'例：喜欢用表情符号，称呼别人为"亲"…' }
          ].map(f => (
            <div key={f.key}>
              <label style={{ fontSize:12, fontWeight:500, color:'#8D6E63', marginBottom:4, display:'block' }}>{f.label}</label>
              {f.key === 'details' ? (
                <textarea value={(editingPersona as any)[f.key]||''} onChange={e => setEditingPersona(p => ({...p, [f.key]: e.target.value}))} placeholder={f.placeholder} rows={3}
                  style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:'1px solid rgba(234,224,213,0.6)', fontSize:13, outline:'none', color:'#3E2723', background:'#F7F3EE', boxSizing:'border-box', resize:'vertical', fontFamily:'inherit' }} />
              ) : (
                <input value={(editingPersona as any)[f.key]||''} onChange={e => setEditingPersona(p => ({...p, [f.key]: e.target.value}))} placeholder={f.placeholder}
                  style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:'1px solid rgba(234,224,213,0.6)', fontSize:13, outline:'none', color:'#3E2723', background:'#F7F3EE', boxSizing:'border-box' }} />
              )}
            </div>
          ))}

          {/* 绑定技能 */}
          <div>
            <label style={{ fontSize:12, fontWeight:500, color:'#8D6E63', marginBottom:8, display:'block' }}>绑定技能（默认全选）</label>
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {allSkills.map(s => {
                const isSelected = selectedSkills.includes(s.id);
                return (
                  <div key={s.id} onClick={() => {
                    setSelectedSkills(prev =>
                      prev.includes(s.id) ? prev.filter(id => id !== s.id) : [...prev, s.id]
                    );
                  }} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:10, cursor:'pointer', background: isSelected ? 'rgba(200,159,126,0.1)' : 'rgba(247,243,238,0.5)', border: isSelected ? '1px solid rgba(200,159,126,0.3)' : '1px solid transparent' }}>
                    <div style={{ width:20, height:20, borderRadius:4, display:'flex', alignItems:'center', justifyContent:'center', border: isSelected ? 'none' : '2px solid #d1d5db', background: isSelected ? 'linear-gradient(135deg,#C89F7E,#B08968)' : 'transparent', color:'white', fontSize:12, fontWeight:600, flexShrink:0 }}>
                      {isSelected ? '✓' : ''}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:500, color:'#3E2723' }}>{s.name}</div>
                      <div style={{ fontSize:11, color:'#8D6E63', marginTop:1 }}>{s.description}</div>
                    </div>
                    <span style={{ fontSize:10, padding:'2px 6px', borderRadius:4, background:'rgba(200,159,126,0.12)', color:'#C89F7E', fontWeight:500 }}>
                      {s.type === 'thinking' ? '思维' : s.type === 'conversation' ? '话术' : '感知'}
                    </span>
                  </div>
                );
              })}
            </div>
            {allSkills.length === 0 && <p style={{ fontSize:12, color:'#8D6E63' }}>加载技能列表中…</p>}
          </div>
        </div>
        <button onClick={async () => {
          if (!editingPersona.name) { alert('请输入角色名称'); return; }
          await fetch(`${API}/api/personas`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({...editingPersona, skills: selectedSkills}) });
          setPage('personas'); loadPersonas();
        }} style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, width:'100%', padding:'12px', borderRadius:12, border:'none', background:'linear-gradient(135deg,#C89F7E,#B08968)', color:'white', fontSize:14, fontWeight:500, cursor:'pointer' }}>
          <Check size={16} strokeWidth={2}/> 保存角色卡
        </button>
      </div>
    );
  }

  // Account & Security page
  if (page === 'account') {
    return (
      <div style={{ display:'flex', flexDirection:'column', height:'100%', padding:'32px 20px 20px', background:'#F7F3EE' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
          <button onClick={() => setPage('main')} style={{ width:32, height:32, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:10, border:'none', background:'none', cursor:'pointer', color:'#8D6E63' }}>
            <ArrowLeft size={20} strokeWidth={1.5} />
          </button>
          <h1 style={{ fontSize:20, fontWeight:600, color:'#3E2723' }}>账号与安全</h1>
        </div>

        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'32px 20px', borderRadius:16, background:'white', marginBottom:24 }}>
          <div style={{ width:64, height:64, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontSize:24, fontWeight:600, background:'linear-gradient(135deg,#C89F7E,#B08968)', marginBottom:12 }}>
            {email ? email[0].toUpperCase() : '?'}
          </div>
          <div style={{ fontSize:16, fontWeight:600, color:'#3E2723' }}>{email || '未登录'}</div>
          <div style={{ fontSize:12, color:'#8D6E63', marginTop:4 }}>当前登录账号</div>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:1, background:'rgba(234,224,213,0.3)', borderRadius:16, overflow:'hidden', marginBottom:'auto' }}>
          <div style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 16px', background:'white' }}>
            <Shield size={20} strokeWidth={1.5} color="#8D6E63" />
            <div>
              <div style={{ fontSize:14, fontWeight:500, color:'#3E2723' }}>注册时间</div>
              <div style={{ fontSize:12, color:'#8D6E63', marginTop:1 }}>{new Date().toLocaleDateString('zh-CN')}</div>
            </div>
          </div>
        </div>

        <button onClick={async () => {
          if (!confirm('确认注销当前扫码用户？\n\n注销后需要重新扫码才能使用。')) return;
          try { await fetch(`${API}/api/logout`, { method:'POST' }); alert('已注销扫码用户，重启页面后将需要重新扫码。'); } catch { alert('注销失败'); }
        }}
          style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, width:'100%', padding:'14px', borderRadius:14, border:'1px solid rgba(200,159,126,0.3)', background:'rgba(200,159,126,0.06)', color:'#C89F7E', fontSize:14, fontWeight:500, cursor:'pointer', marginTop:8 }}>
          <LogOut size={16} strokeWidth={1.5} /> 注销扫码用户
        </button>

        <button onClick={handleDeleteAccount}
          style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, width:'100%', padding:'14px', borderRadius:14, border:'1px solid rgba(239,68,68,0.2)', background:'rgba(239,68,68,0.04)', color:'#ef4444', fontSize:14, fontWeight:500, cursor:'pointer', marginTop:8 }}>
          <AlertTriangle size={16} strokeWidth={1.5} /> 注销账号
        </button>
      </div>
    );
  }

  const [logs, setLogs] = useState<any[]>([]);
  const [logFilter, setLogFilter] = useState<'all'|'ERROR'>('all');
  const loadLogs = useCallback(async () => {
    try { const r = await fetch(`${API}/api/logs`); const d = await r.json(); setLogs(Array.isArray(d) ? d : []); } catch {}
  }, []);
  useEffect(() => { if (page === 'logs') { loadLogs(); const t = setInterval(loadLogs, 3000); return () => clearInterval(t); } }, [page, loadLogs]);

  if (page === 'logs') {
    const filtered = logFilter === 'all' ? logs : logs.filter((l:any) => l.level === 'ERROR');
    return (
      <div style={{ display:'flex', flexDirection:'column', height:'100%', background:'#F7F3EE' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, padding:'16px 16px 8px' }}>
          <button onClick={() => setPage('main')} style={{ width:32, height:32, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:10, border:'none', background:'none', cursor:'pointer', color:'#8D6E63' }}>
            <ArrowLeft size={20} strokeWidth={1.5} />
          </button>
          <h1 style={{ fontSize:20, fontWeight:600, color:'#3E2723', flex:1 }}>运行日志</h1>
          <button onClick={() => { fetch('${API}/api/logs/clear', {method:'POST'}); setLogs([]); }}
            style={{ padding:'6px 14px', borderRadius:10, border:'none', background:'rgba(239,68,68,0.08)', color:'#ef4444', fontSize:12, fontWeight:500, cursor:'pointer' }}>清空</button>
          <button onClick={() => { setLogFilter(f => f === 'all' ? 'ERROR' : 'all'); }}
            style={{ padding:'6px 14px', borderRadius:10, border:'none', background:'rgba(200,159,126,0.12)', color:'#C89F7E', fontSize:12, fontWeight:500, cursor:'pointer' }}>{logFilter === 'all' ? '仅错误' : '全部'}</button>
          <button onClick={() => { const t = filtered.map((l:any) => '['+l.time+']['+l.level+']['+l.tag+'] '+l.msg).join('\n'); navigator.clipboard.writeText(t).catch(()=>{}); }}
            style={{ padding:'6px 14px', borderRadius:10, border:'none', background:'rgba(16,185,129,0.1)', color:'#10b981', fontSize:12, fontWeight:500, cursor:'pointer' }}>📋 复制</button>
        </div>
        <div style={{ flex:1, overflow:'auto', padding:'8px 12px', fontFamily:'monospace', fontSize:11, lineHeight:1.6 }}>
          {filtered.length === 0 ? (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60%', color:'#8D6E63', fontSize:13 }}>暂无日志</div>
          ) : filtered.map((l:any, i:number) => (
            <div key={i} style={{ marginBottom:4, padding:'6px 8px', borderRadius:8, background: l.level === 'ERROR' ? 'rgba(239,68,68,0.06)' : l.level === 'WARN' ? 'rgba(245,158,11,0.06)' : 'white', borderLeft: l.level === 'ERROR' ? '3px solid #ef4444' : l.level === 'WARN' ? '3px solid #f59e0b' : '3px solid transparent' }}>
              <span style={{ color:'#8D6E63' }}>[{l.time}]</span>
              {l.level !== 'INFO' && <span style={{ color: l.level === 'ERROR' ? '#ef4444' : '#f59e0b', fontWeight:600 }}>[{l.level}]</span>}
              <span style={{ color:'#C89F7E' }}>[{l.tag}]</span>
              <span style={{ color:'#3E2723' }}> {l.msg}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', padding:'32px 20px 20px', background:'#F7F3EE' }}>
      <h1 style={{ fontSize:22, fontWeight:600, color:'#3E2723', marginBottom:6 }}>设置</h1>

      <div style={{ display:'flex', alignItems:'center', gap:14, padding:'16px', borderRadius:16, background:'white', marginBottom:24, boxShadow:'0 2px 8px rgba(0,0,0,0.04)' }}>
        <div style={{ width:48, height:48, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontSize:20, fontWeight:600, background:'linear-gradient(135deg,#C89F7E,#B08968)' }}>
          {email ? email[0].toUpperCase() : '?'}
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:15, fontWeight:600, color:'#3E2723' }}>{email || '未登录'}</div>
          <div style={{ fontSize:12, color:'#8D6E63', marginTop:2 }}>微信 Bot 账号</div>
        </div>
        <ChevronRight size={18} strokeWidth={1.5} color="#8D6E6340" />
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:1, background:'rgba(234,224,213,0.3)', borderRadius:16, overflow:'hidden', marginBottom:'auto' }}>
        <div onClick={() => setPage('account')} style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 16px', background:'white', cursor:'pointer' }}>
          <Shield size={20} strokeWidth={1.5} color="#8D6E63" />
          <span style={{ fontSize:14, fontWeight:500, color:'#3E2723', flex:1 }}>账号与安全</span>
          <ChevronRight size={16} strokeWidth={1.5} color="#8D6E6340" />
        </div>
        <div onClick={() => setPage('personas')} style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 16px', background:'white', cursor:'pointer' }}>
          <BookOpen size={20} strokeWidth={1.5} color="#8D6E63" />
          <span style={{ fontSize:14, fontWeight:500, color:'#3E2723', flex:1 }}>角色卡</span>
          <span style={{ fontSize:11, color:'#8D6E63', background:'rgba(200,159,126,0.12)', padding:'2px 8px', borderRadius:999 }}>{personas.length}</span>
          <ChevronRight size={16} strokeWidth={1.5} color="#8D6E6340" />
        </div>
        <div onClick={() => setPage('ai')} style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 16px', background:'white', cursor:'pointer' }}>
          <MessageSquare size={20} strokeWidth={1.5} color="#8D6E63" />
          <span style={{ fontSize:14, fontWeight:500, color:'#3E2723', flex:1 }}>AI 自动回复</span>
          <ChevronRight size={16} strokeWidth={1.5} color="#8D6E6340" />
        </div>
        <div onClick={() => setPage('logs')} style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 16px', background:'white', cursor:'pointer' }}>
          <AlertTriangle size={20} strokeWidth={1.5} color="#8D6E63" />
          <span style={{ fontSize:14, fontWeight:500, color:'#3E2723', flex:1 }}>运行日志</span>
          <ChevronRight size={16} strokeWidth={1.5} color="#8D6E6340" />
        </div>
        {[{ icon: Bell, label: '消息通知' }, { icon: Lock, label: '隐私' }, { icon: Sliders, label: '通用' }, { icon: Info, label: '关于' }].map((item,i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 16px', background:'white' }}>
            <item.icon size={20} strokeWidth={1.5} color="#8D6E63" />
            <span style={{ fontSize:14, fontWeight:500, color:'#3E2723', flex:1 }}>{item.label}</span>
          </div>
        ))}
      </div>

      <button onClick={onLogout}
        style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, width:'100%', padding:'14px', borderRadius:14, border:'none', background:'rgba(239,68,68,0.06)', color:'#ef4444', fontSize:14, fontWeight:500, cursor:'pointer', marginTop:16 }}>
        <LogOut size={16} strokeWidth={1.5} /> 退出登录
      </button>
    </div>
  );
}
