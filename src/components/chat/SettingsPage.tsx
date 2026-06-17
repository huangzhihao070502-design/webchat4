import { useState, useEffect, useCallback } from "react";
import { Shield, Bell, Lock, Sliders, Info, LogOut, ChevronRight, ArrowLeft, AlertTriangle, MessageSquare, Check, X, Loader, Edit3, Trash2, BookOpen, Volume2, Monitor, Eye, EyeOff, Trash, Download, Upload, Moon, Sun, Type, Globe, Smartphone, ShieldCheck, Clock, FileText, Zap } from "lucide-react";
import { useSettings } from "../../contexts/SettingsContext";

interface Props { onLogout: () => void }

const API = "";

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#8D6E63] transition-colors hover:bg-[#8D6E63]/10 active:bg-[#8D6E63]/20">
      <ArrowLeft size={20} strokeWidth={1.5} />
    </button>
  );
}

function PageHeader({ title, onBack, children }: { title: string; onBack: () => void; children?: React.ReactNode }) {
  return (
    <div className="mb-5 flex items-center gap-3 sm:mb-6">
      <BackButton onClick={onBack} />
      <h1 className="text-lg font-semibold text-[#3E2723] sm:text-xl">{title}</h1>
      {children && <div className="ml-auto flex items-center gap-2">{children}</div>}
    </div>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl bg-white p-4 shadow-sm sm:p-5 ${className}`}>{children}</div>;
}

function Toggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} className={`relative h-[26px] w-11 shrink-0 rounded-full transition-colors ${enabled ? "bg-gradient-to-r from-emerald-500 to-emerald-600" : "bg-gray-300"}`}>
      <span className={`absolute top-0.5 h-[22px] w-[22px] rounded-full bg-white shadow transition-transform ${enabled ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );
}

function FormInput({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-[#8D6E63] sm:text-sm">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full rounded-xl border border-[#EAE0D5]/60 bg-[#F7F3EE] px-3 py-2.5 text-sm text-[#3E2723] outline-none transition-colors placeholder:text-[#8D6E63]/40 focus:border-[#C89F7E]/50 focus:ring-2 focus:ring-[#C89F7E]/10 sm:px-4 sm:py-3" />
    </div>
  );
}

function FormTextarea({ label, value, onChange, placeholder, rows = 3 }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-[#8D6E63] sm:text-sm">{label}</label>
      <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows} className="w-full resize-y rounded-xl border border-[#EAE0D5]/60 bg-[#F7F3EE] px-3 py-2.5 text-sm text-[#3E2723] outline-none transition-colors placeholder:text-[#8D6E63]/40 focus:border-[#C89F7E]/50 focus:ring-2 focus:ring-[#C89F7E]/10 sm:px-4 sm:py-3" />
    </div>
  );
}

function SelectInput({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-[#8D6E63] sm:text-sm">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} className="w-full appearance-none rounded-xl border border-[#EAE0D5]/60 bg-[#F7F3EE] px-3 py-2.5 text-sm text-[#3E2723] outline-none transition-colors focus:border-[#C89F7E]/50 focus:ring-2 focus:ring-[#C89F7E]/10 sm:px-4 sm:py-3">
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function SettingRow({ icon: Icon, label, onClick, badge, trailing }: { icon: any; label: string; onClick?: () => void; badge?: string | number; trailing?: React.ReactNode }) {
  return (
    <div onClick={onClick} className={`flex items-center gap-3 rounded-xl p-3 transition-colors sm:gap-4 sm:p-3.5 ${onClick ? "cursor-pointer hover:bg-[#F7F3EE]" : ""}`}>
      <Icon size={20} strokeWidth={1.5} className="shrink-0 text-[#8D6E63]" />
      <span className="flex-1 text-sm font-medium text-[#3E2723] sm:text-[15px]">{label}</span>
      {badge !== undefined && <span className="rounded-full bg-[#C89F7E]/12 px-2 py-0.5 text-[11px] font-medium text-[#C89F7E]">{badge}</span>}
      {trailing ?? <ChevronRight size={16} strokeWidth={1.5} className="shrink-0 text-[#8D6E63]/30" />}
    </div>
  );
}

export default function SettingsPage({ onLogout }: Props) {
  const [email, setEmail] = useState("");
  const [page, setPage] = useState<"main" | "account" | "ai" | "personas" | "personaEdit" | "logs" | "features" | "notifications" | "privacy" | "general" | "about">("main");
  const { settings, updateSettings, toggleFeature } = useSettings();
  const [featureList, setFeatureList] = useState<any[]>([]);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [personas, setPersonas] = useState<any[]>([]);
  const [personaMap, setPersonaMap] = useState<Record<string, string>>({});
  const [editingPersona, setEditingPersona] = useState<any>({ name: "", personality: "", style: "", background: "", details: "" });
  const [users, setUsers] = useState<string[]>([]);
  const [expandedPersona, setExpandedPersona] = useState<string | null>(null);
  const [allSkills, setAllSkills] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [logFilter, setLogFilter] = useState<"all" | "ERROR">("all");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [aiCfg, setAiCfg] = useState({ enabled: false, api_url: "", api_key: "", model: "", prompt: "", scheduled_reply: false, active_interval: 60, max_replies: 2, reply_min_chars: 0, reply_max_chars: 0, token_limit: 0 });
  const [aiTestResult, setAiTestResult] = useState<string | null>(null);
  const [aiTesting, setAiTesting] = useState(false);
  const [aiSaved, setAiSaved] = useState(false);

  const loadLogs = useCallback(async () => { try { const r = await fetch(`${API}/api/logs`); const d = await r.json(); setLogs(Array.isArray(d) ? d : []); } catch {} }, []);
  useEffect(() => { if (page === "logs") { loadLogs(); const t = setInterval(loadLogs, 3000); return () => clearInterval(t); } }, [page, loadLogs]);
  useEffect(() => { try { const s = localStorage.getItem("aperture_session"); if (s) { const d = JSON.parse(s); if (d.email) setEmail(d.email); } } catch {} }, []);
  const loadPersonas = useCallback(async () => { try { const r = await fetch(`${API}/api/personas`); const d = await r.json(); if (d.personas) setPersonas(d.personas); if (d.user_map) setPersonaMap(d.user_map); } catch {} }, []);
  useEffect(() => { if (page === "personas") { loadPersonas(); fetch(`${API}/api/users`).then(r => r.json()).then(d => { if (d.users) setUsers(d.users); }).catch(() => {}); fetch(`${API}/api/skills`).then(r => r.json()).then(d => { if (d.skills) setAllSkills(d.skills); }).catch(() => {}); } }, [page, loadPersonas]);
  useEffect(() => { if (page !== "personaEdit") return; fetch(`${API}/api/skills`).then(r => r.json()).then(d => { if (d.skills) { setAllSkills(d.skills); setSelectedSkills(editingPersona.id && editingPersona.skills?.length > 0 ? editingPersona.skills : d.skills.map((s: any) => s.id)); } }).catch(() => {}); }, [page]);
  useEffect(() => { if (page === "ai") { fetch(`${API}/api/ai-config`).then(r => r.json()).then(d => { if (d && typeof d === "object") setAiCfg({ enabled: d.enabled || false, api_url: d.api_url || "", api_key: d.api_key || "", model: d.model || "", prompt: d.prompt || "", scheduled_reply: d.scheduled_reply || false, active_interval: d.active_interval || 60, max_replies: d.max_replies || 2, reply_min_chars: d.reply_min_chars || 0, reply_max_chars: d.reply_max_chars || 0, token_limit: d.token_limit || 0 }); }).catch(() => {}); } }, [page]);
  const handleSaveSettings = useCallback((patch: Record<string, any>) => { updateSettings(patch); setSettingsSaved(true); setTimeout(() => setSettingsSaved(false), 2000); }, [updateSettings]);

  const handleSaveAi = useCallback(async () => { try { await fetch(`${API}/api/ai-config`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(aiCfg) }); setAiSaved(true); setTimeout(() => setAiSaved(false), 2000); } catch {} }, [aiCfg]);
  const handleTestAi = useCallback(async () => { setAiTesting(true); setAiTestResult(null); try { const r = await fetch(`${API}/api/ai-test`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ api_url: aiCfg.api_url, api_key: aiCfg.api_key, model: aiCfg.model }) }); const d = await r.json(); setAiTestResult(d.success ? `✅ 连接成功！回复：${d.reply}` : `❌ ${d.error}`); } catch { setAiTestResult("❌ 测试失败"); } setAiTesting(false); }, [aiCfg]);
  const handleDeleteAccount = () => { if (!confirm("确认注销账号？\n\n注销后账号数据将被清除，不可恢复。")) return; if (!confirm("再次确认：真的要注销吗？")) return; try { localStorage.removeItem("aperture_auth"); localStorage.removeItem("aperture_session"); } catch {} onLogout(); };

  if (page === "ai") {
    return (
      <div className="flex h-full flex-col overflow-auto bg-[#F7F3EE]">
        <div className="w-full px-4 py-6 sm:px-5 sm:py-8 lg:px-6">
          <PageHeader title="AI 自动回复" onBack={() => setPage("main")} />
          <Card className="mb-4">
            <div className="flex items-center gap-3">
              <Toggle enabled={aiCfg.enabled} onToggle={() => setAiCfg(p => ({ ...p, enabled: !p.enabled }))} />
              <span className="text-sm font-medium text-[#3E2723] sm:text-[15px]">启用 AI 自动回复</span>
            </div>
          </Card>
          <Card className="mb-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2"><FormInput label="API 地址" value={aiCfg.api_url} onChange={v => setAiCfg(p => ({ ...p, api_url: v }))} placeholder="https://api.deepseek.com/v1" /></div>
              <FormInput label="API 密钥" value={aiCfg.api_key} onChange={v => setAiCfg(p => ({ ...p, api_key: v }))} placeholder="sk-xxxxxxxxxxxx" type="password" />
              <FormInput label="模型" value={aiCfg.model} onChange={v => setAiCfg(p => ({ ...p, model: v }))} placeholder="deepseek-chat / gpt-4o" />
            </div>
            <div className="mt-4"><FormTextarea label="提示词（设定 AI 行为和规则）" value={aiCfg.prompt} onChange={v => setAiCfg(p => ({ ...p, prompt: v }))} placeholder="你是一个热情的微信聊天助手..." rows={4} /></div>
            <div className="mt-4">
              <label className="mb-2 block text-xs font-medium text-[#8D6E63] sm:text-sm">每条消息最多回复条数</label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map(n => (<button key={n} onClick={() => setAiCfg(p => ({ ...p, max_replies: n }))} className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium transition-all sm:h-10 sm:w-10 ${aiCfg.max_replies === n ? "border-2 border-[#C89F7E] bg-[#C89F7E]/10 text-[#C89F7E]" : "border border-[#EAE0D5]/60 bg-[#F7F3EE] text-[#8D6E63]"}`}>{n}</button>))}
                <span className="ml-1 text-xs text-[#8D6E63] sm:text-sm">条</span>
              </div>
            </div>
            <div className="mt-5">
              <label className="mb-2 block text-xs font-medium text-[#8D6E63] sm:text-sm">回复字数限制（0 为不限制）</label>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <input type="number" min={0} max={10000} value={aiCfg.reply_min_chars} onChange={e => setAiCfg(p => ({ ...p, reply_min_chars: Math.max(0, parseInt(e.target.value) || 0) }))} className="w-20 rounded-lg border border-[#EAE0D5]/60 bg-[#F7F3EE] px-3 py-2 text-center text-sm text-[#3E2723] outline-none focus:border-[#C89F7E]/50 sm:w-24" />
                <span className="text-sm text-[#8D6E63]">~</span>
                <input type="number" min={0} max={10000} value={aiCfg.reply_max_chars} onChange={e => setAiCfg(p => ({ ...p, reply_max_chars: Math.max(0, parseInt(e.target.value) || 0) }))} className="w-20 rounded-lg border border-[#EAE0D5]/60 bg-[#F7F3EE] px-3 py-2 text-center text-sm text-[#3E2723] outline-none focus:border-[#C89F7E]/50 sm:w-24" />
                <span className="text-sm text-[#8D6E63]">字</span>
              </div>
              <p className="mt-1.5 text-[11px] leading-relaxed text-[#8D6E63]/50">设置后 AI 回复会尽量控制在指定字数范围内，先保存再生效。</p>
            </div>
            <div className="mt-5">
              <label className="mb-2 block text-xs font-medium text-[#8D6E63] sm:text-sm">Token 消耗限制</label>
              <div className="flex items-center gap-3">
                <input type="range" min={0} max={8192} step={256} value={aiCfg.token_limit} onChange={e => setAiCfg(p => ({ ...p, token_limit: parseInt(e.target.value) }))} className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full" style={{ background: aiCfg.token_limit > 0 ? "linear-gradient(90deg, #10b981, #f59e0b, #ef4444)" : "#d1d5db" }} />
                <span className="min-w-[60px] text-center text-sm font-semibold text-[#3E2723]">{aiCfg.token_limit === 0 ? "无限制" : aiCfg.token_limit >= 1000 ? `${(aiCfg.token_limit / 1000).toFixed(1)}k` : `${aiCfg.token_limit}`}</span>
              </div>
              <div className="mt-1 flex justify-between px-0.5"><span className="text-[10px] text-emerald-500">无限制</span><span className="text-[10px] text-amber-500">512</span><span className="text-[10px] text-red-500">8k</span></div>
              <p className="mt-1 text-[11px] leading-relaxed text-[#8D6E63]/50">{aiCfg.token_limit === 0 ? "无限制：AI 可根据内容自由消耗 Token。" : `限制每次 API 调用最多消耗 ${aiCfg.token_limit} Tokens。`}</p>
            </div>
          </Card>
          <Card className="mb-4">
            <div className="flex items-center gap-3">
              <Toggle enabled={aiCfg.scheduled_reply} onToggle={() => setAiCfg(p => ({ ...p, scheduled_reply: !p.scheduled_reply }))} />
              <span className="text-sm font-medium text-[#3E2723] sm:text-[15px]">定时主动发送消息</span>
            </div>
            {aiCfg.scheduled_reply && (<div className="mt-3 flex items-center gap-2"><span className="whitespace-nowrap text-sm text-[#8D6E63]">每隔</span><input type="number" min={1} max={1440} value={aiCfg.active_interval} onChange={e => setAiCfg(p => ({ ...p, active_interval: Math.max(1, parseInt(e.target.value) || 60) }))} className="w-16 rounded-lg border border-[#EAE0D5]/60 bg-[#F7F3EE] px-3 py-2 text-center text-sm text-[#3E2723] outline-none focus:border-[#C89F7E]/50 sm:w-20" /><span className="text-sm text-[#8D6E63]">分钟</span></div>)}
            {aiCfg.scheduled_reply && <p className="mt-2 text-[11px] leading-relaxed text-[#8D6E63]/50">AI 将按设定间隔主动向每个用户发送问候消息。</p>}
          </Card>
          <div className="flex gap-3">
            <button onClick={handleSaveAi} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#C89F7E] to-[#B08968] px-4 py-3 text-sm font-medium text-white transition-all hover:brightness-105 active:brightness-95">{aiSaved ? <><Check size={16} strokeWidth={2} /> 已保存</> : "保存配置"}</button>
            <button onClick={handleTestAi} disabled={aiTesting || !aiCfg.api_url || !aiCfg.api_key} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#C89F7E]/30 bg-white px-4 py-3 text-sm font-medium text-[#C89F7E] transition-all hover:bg-[#C89F7E]/5 disabled:opacity-40">{aiTesting ? <><Loader size={16} strokeWidth={2} className="animate-spin" /> 测试中...</> : "测试连接"}</button>
          </div>
          {aiTestResult && <div className="mt-3 rounded-xl bg-white px-4 py-3 text-sm leading-relaxed text-[#3E2723]">{aiTestResult}</div>}
        </div>
      </div>
    );
  }

  if (page === "personas") {
    return (
      <div className="flex h-full flex-col overflow-auto bg-[#F7F3EE]">
        <div className="w-full px-4 py-6 sm:px-5 sm:py-8 lg:px-6">
          <div className="mb-5 flex items-center justify-between sm:mb-6">
            <div className="flex items-center gap-3"><BackButton onClick={() => setPage("main")} /><h1 className="text-lg font-semibold text-[#3E2723] sm:text-xl">角色卡 <span className="text-sm font-normal text-[#8D6E63]">({personas.length})</span></h1></div>
            <button onClick={() => { setEditingPersona({ name: "", personality: "", style: "", background: "", details: "" }); setPage("personaEdit"); }} className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-r from-[#C89F7E] to-[#B08968] text-white shadow-md transition-all hover:brightness-105">+</button>
          </div>
          {personas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center"><BookOpen size={48} strokeWidth={1} className="text-[#8D6E63]/25" /><p className="mt-3 text-sm text-[#8D6E63]">暂无角色卡</p><p className="mt-1 text-xs text-[#8D6E63]/60">点击右上角 + 创建角色卡</p></div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {personas.map(p => {
                const isExpanded = expandedPersona === p.id;
                const assignedUserId = Object.entries(personaMap).find(([, pid]) => pid === p.id)?.[0] || "";
                return (
                  <div key={p.id}>
                    <div className="flex items-center gap-3 rounded-2xl bg-white p-3.5 shadow-sm sm:p-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-[#C89F7E] to-[#B08968] text-sm font-semibold text-white sm:h-11 sm:w-11">{p.name ? p.name[0].toUpperCase() : "?"}</div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-[#3E2723] sm:text-[15px]">{p.name || "未命名"}</div>
                        <div className="mt-0.5 truncate text-xs text-[#8D6E63] sm:text-[13px]">{p.personality || p.background || "无描述"}</div>
                        {assignedUserId && <div className="mt-1 text-[11px] text-emerald-500">已分配给: {assignedUserId.slice(0, 12)}...</div>}
                        {p.skills && p.skills.length > 0 && <div className="mt-1.5 flex flex-wrap gap-1">{p.skills.map((sid: string) => { const skill = allSkills.find((s: any) => s.id === sid); return skill ? <span key={sid} className="rounded bg-[#C89F7E]/10 px-1.5 py-0.5 text-[10px] font-medium text-[#C89F7E]">{skill.name}</span> : null; })}</div>}
                      </div>
                      <div className="flex shrink-0 flex-col gap-1.5 sm:flex-row sm:gap-2">
                        <button onClick={() => { setEditingPersona(p); setPage("personaEdit"); }} className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#C89F7E]/10 text-[#C89F7E] transition-colors hover:bg-[#C89F7E]/20"><Edit3 size={14} strokeWidth={1.5} /></button>
                        <button onClick={async () => { if (confirm(`删除角色卡「${p.name}」？`)) { await fetch(`${API}/api/personas/delete`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: p.id }) }); loadPersonas(); } }} className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/8 text-red-500 transition-colors hover:bg-red-500/15"><Trash2 size={14} strokeWidth={1.5} /></button>
                        <button onClick={() => setExpandedPersona(isExpanded ? null : p.id)} className="flex h-8 items-center justify-center rounded-lg bg-[#C89F7E]/10 px-2 text-[11px] font-semibold text-[#8D6E63] transition-colors hover:bg-[#C89F7E]/20 sm:w-auto">管理</button>
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="mt-0 rounded-b-2xl border-t border-[#EAE0D5]/30 bg-[#F7F3EE]/80 p-3">
                        <div className="mb-2 text-xs font-medium text-[#8D6E63]">选择要分配的用户：</div>
                        {users.length === 0 ? <div className="py-3 text-xs text-[#8D6E63]">暂无用户</div> : <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">{users.map(uid => { const isAssigned = personaMap[uid] === p.id; return (<div key={uid} onClick={async () => { const newMap = { ...personaMap }; if (isAssigned) { delete newMap[uid]; } else { for (const u of Object.keys(newMap)) { if (newMap[u] === p.id) delete newMap[u]; } newMap[uid] = p.id; } await fetch(`${API}/api/personas/assign`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ user_id: uid, persona_id: isAssigned ? "" : p.id }) }); setPersonaMap(newMap); }} className={`flex cursor-pointer items-center gap-2.5 rounded-xl p-2.5 transition-colors ${isAssigned ? "border border-[#C89F7E]/25 bg-[#C89F7E]/10" : "border border-transparent bg-white"}`}><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-[#C89F7E] to-[#B08968] text-[11px] font-semibold text-white">{uid.slice(0, 2).toUpperCase()}</div><div className="min-w-0 flex-1"><div className="truncate text-[12px] font-medium text-[#3E2723]">{uid.slice(0, 12)}...</div></div>{isAssigned && <span className="shrink-0 rounded-full bg-[#C89F7E]/15 px-2 py-0.5 text-[10px] font-medium text-[#C89F7E]">已分配</span>}</div>); })}</div>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (page === "personaEdit") {
    return (
      <div className="flex h-full flex-col overflow-auto bg-[#F7F3EE]">
        <div className="w-full px-4 py-6 sm:px-5 sm:py-8 lg:px-6">
          <PageHeader title={editingPersona.id ? "编辑角色卡" : "创建角色卡"} onBack={() => setPage("personas")} />
          <Card className="mb-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {[{ key: "name", label: "名称", placeholder: "例：小暖" }, { key: "personality", label: "性格", placeholder: "例：温柔、善解人意" }, { key: "style", label: "做事风格", placeholder: "例：耐心倾听" }, { key: "background", label: "背景故事", placeholder: "例：心理咨询师" }].map(f => (<div key={f.key}><label className="mb-1.5 block text-xs font-medium text-[#8D6E63] sm:text-sm">{f.label}</label><input value={(editingPersona as any)[f.key] || ""} onChange={e => setEditingPersona((p: any) => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} className="w-full rounded-xl border border-[#EAE0D5]/60 bg-[#F7F3EE] px-3 py-2.5 text-sm text-[#3E2723] outline-none transition-colors placeholder:text-[#8D6E63]/40 focus:border-[#C89F7E]/50 focus:ring-2 focus:ring-[#C89F7E]/10 sm:px-4 sm:py-3" /></div>))}
              <div className="sm:col-span-2"><FormTextarea label="其他设定" value={editingPersona.details || ""} onChange={v => setEditingPersona((p: any) => ({ ...p, details: v }))} placeholder="例：喜欢用表情符号" rows={3} /></div>
            </div>
            <div className="mt-5">
              <label className="mb-2 block text-xs font-medium text-[#8D6E63] sm:text-sm">绑定技能（默认全选）</label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{allSkills.map(s => { const isSelected = selectedSkills.includes(s.id); return (<div key={s.id} onClick={() => setSelectedSkills(prev => prev.includes(s.id) ? prev.filter(id => id !== s.id) : [...prev, s.id])} className={`flex cursor-pointer items-center gap-3 rounded-xl p-3 transition-colors ${isSelected ? "border border-[#C89F7E]/30 bg-[#C89F7E]/10" : "border border-transparent bg-[#F7F3EE]/50"}`}><div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded text-xs font-semibold ${isSelected ? "bg-gradient-to-r from-[#C89F7E] to-[#B08968] text-white" : "border-2 border-gray-300 text-transparent"}`}>{isSelected ? "✓" : ""}</div><div className="min-w-0 flex-1"><div className="text-[13px] font-medium text-[#3E2723]">{s.name}</div><div className="mt-0.5 text-[11px] text-[#8D6E63]">{s.description}</div></div><span className="shrink-0 rounded bg-[#C89F7E]/12 px-1.5 py-0.5 text-[10px] font-medium text-[#C89F7E]">{s.type === "thinking" ? "思维" : s.type === "conversation" ? "话术" : "感知"}</span></div>); })}</div>
              {allSkills.length === 0 && <p className="mt-2 text-xs text-[#8D6E63]">加载技能列表中…</p>}
            </div>
          </Card>
          <button onClick={async () => { if (!editingPersona.name) { alert("请输入角色名称"); return; } await fetch(`${API}/api/personas`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...editingPersona, skills: selectedSkills }) }); setPage("personas"); loadPersonas(); }} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#C89F7E] to-[#B08968] px-4 py-3 text-sm font-medium text-white transition-all hover:brightness-105 active:brightness-95"><Check size={16} strokeWidth={2} /> 保存角色卡</button>
        </div>
      </div>
    );
  }

  if (page === "account") {
    return (
      <div className="flex h-full flex-col overflow-auto bg-[#F7F3EE]">
        <div className="w-full px-4 py-6 sm:px-5 sm:py-8 lg:px-6">
          <PageHeader title="账号与安全" onBack={() => setPage("main")} />
          <div className="mb-6 flex flex-col items-center rounded-2xl bg-white p-6 shadow-sm sm:p-8"><div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-[#C89F7E] to-[#B08968] text-2xl font-semibold text-white sm:h-[72px] sm:w-[72px]">{email ? email[0].toUpperCase() : "?"}</div><div className="mt-3 text-base font-semibold text-[#3E2723] sm:text-lg">{email || "未登录"}</div><div className="mt-1 text-xs text-[#8D6E63] sm:text-sm">当前登录账号</div></div>
          <Card className="mb-6"><div className="flex items-center gap-3"><Shield size={20} strokeWidth={1.5} className="shrink-0 text-[#8D6E63]" /><div><div className="text-sm font-medium text-[#3E2723]">注册时间</div><div className="mt-0.5 text-xs text-[#8D6E63]">{new Date().toLocaleDateString("zh-CN")}</div></div></div></Card>
          <div className="flex flex-col gap-3">
            <button onClick={async () => { if (!confirm("确认注销当前扫码用户？")) return; try { await fetch(`${API}/api/logout`, { method: "POST" }); alert("已注销"); } catch { alert("注销失败"); } }} className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#C89F7E]/30 bg-[#C89F7E]/5 px-4 py-3.5 text-sm font-medium text-[#C89F7E] transition-all hover:bg-[#C89F7E]/10"><LogOut size={16} strokeWidth={1.5} /> 注销扫码用户</button>
            <button onClick={handleDeleteAccount} className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/4 px-4 py-3.5 text-sm font-medium text-red-500 transition-all hover:bg-red-500/8"><AlertTriangle size={16} strokeWidth={1.5} /> 注销账号</button>
          </div>
        </div>
      </div>
    );
  }

  if (page === "logs") {
    const filtered = logFilter === "all" ? logs : logs.filter((l: any) => l.level === "ERROR");
    return (
      <div className="flex h-full flex-col overflow-auto bg-[#F7F3EE]">
        <div className="flex w-full flex-1 flex-col px-4 py-6 sm:px-5 sm:py-8 lg:px-6">
          <div className="mb-4 flex items-center gap-3 sm:mb-5"><BackButton onClick={() => setPage("main")} /><h1 className="flex-1 text-lg font-semibold text-[#3E2723] sm:text-xl">运行日志</h1><button onClick={() => { fetch("/api/logs/clear", { method: "POST" }); setLogs([]); }} className="rounded-lg bg-red-500/8 px-2.5 py-1.5 text-xs text-red-500">清空</button><button onClick={() => setLogFilter(f => f === "all" ? "ERROR" : "all")} className="rounded-lg bg-[#C89F7E]/12 px-2.5 py-1.5 text-xs text-[#C89F7E]">{logFilter === "all" ? "仅错误" : "全部"}</button><button onClick={() => { const t = filtered.map((l: any) => `[${l.time}][${l.level}][${l.tag}] ${l.msg}`).join("\n"); navigator.clipboard.writeText(t).catch(() => {}); }} className="rounded-lg bg-emerald-500/10 px-2.5 py-1.5 text-xs text-emerald-500">复制</button></div>
          <div className="flex-1 overflow-auto font-mono text-[11px] leading-relaxed sm:text-xs">{filtered.length === 0 ? <div className="flex items-center justify-center py-24 text-sm text-[#8D6E63]">暂无日志</div> : filtered.map((l: any, i: number) => (<div key={i} className={`mb-1 rounded-lg border-l-[3px] px-3 py-2 ${l.level === "ERROR" ? "border-red-500 bg-red-500/5" : l.level === "WARN" ? "border-amber-500 bg-amber-500/5" : "border-transparent bg-white"}`}><span className="text-[#8D6E63]">[{l.time}]</span>{l.level !== "INFO" && <span className={`ml-1 font-semibold ${l.level === "ERROR" ? "text-red-500" : "text-amber-500"}`}>[{l.level}]</span>}<span className="ml-1 text-[#C89F7E]">[{l.tag}]</span><span className="ml-1 text-[#3E2723]">{l.msg}</span></div>))}</div>
        </div>
      </div>
    );
  }

  if (page === "features") {
    const featureCategories = [
      { cat: "天气与位置", items: [
        { id: "weather", name: "天气查询", icon: "🌤", desc: "实时天气，支持全国城市" },
        { id: "weather_3d", name: "天气预报", icon: "📅", desc: "未来三天预报" },
        { id: "ip_location", name: "IP 定位", icon: "📍", desc: "IP 地址地理定位" },
      ]},
      { cat: "金融", items: [
        { id: "exchange_rate", name: "汇率换算", icon: "💱", desc: "实时汇率查询" },
        { id: "crypto", name: "加密货币", icon: "₿", desc: "BTC/ETH 等币价" },
      ]},
      { cat: "内容与娱乐", items: [
        { id: "hitokoto", name: "随机一言", icon: "💭", desc: "随机名言语录" },
        { id: "joke", name: "随机笑话", icon: "😂", desc: "英文随机笑话" },
        { id: "cat_image", name: "随机猫咪", icon: "🐱", desc: "随机猫咪图片" },
        { id: "dog_image", name: "随机狗狗", icon: "🐶", desc: "随机狗狗图片" },
        { id: "news_hn", name: "科技新闻", icon: "📰", desc: "Hacker News 热榜" },
        { id: "numbers", name: "数字趣闻", icon: "🔢", desc: "数字冷知识" },
      ]},
    ];
    return (
      <div className="flex h-full flex-col overflow-auto bg-[#F7F3EE]">
        <div className="w-full px-4 py-6 sm:px-5 sm:py-8 lg:px-6">
          <PageHeader title="功能选项" onBack={() => setPage("main")} />
          <p className="mb-4 text-xs text-[#8D6E63] sm:text-sm">开启后 AI 聊天时可自动调用这些功能，关闭则不使用。所有接口免费无需注册。</p>
          {featureCategories.map(cat => (
            <div key={cat.cat} className="mb-4">
              <div className="mb-2 px-1 text-xs font-medium text-[#8D6E63]/60">{cat.cat}</div>
              <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
                {cat.items.map((f, i) => {
                  const enabled = settings.features?.[f.id] !== false;
                  return (
                    <div key={f.id} className={`flex items-center gap-3 p-3.5 sm:p-4 ${i > 0 ? "border-t border-[#EAE0D5]/30" : ""}`}>
                      <span className="text-xl">{f.icon}</span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-[#3E2723] sm:text-[15px]">{f.name}</div>
                        <div className="mt-0.5 text-[11px] text-[#8D6E63] sm:text-xs">{f.desc}</div>
                      </div>
                      <Toggle enabled={enabled} onToggle={() => toggleFeature(f.id)} />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (page === "notifications") {
    return (
      <div className="flex h-full flex-col overflow-auto bg-[#F7F3EE]">
        <div className="w-full px-4 py-6 sm:px-5 sm:py-8 lg:px-6">
          <PageHeader title="消息通知" onBack={() => setPage("main")} />
          <Card className="mb-4">
            <div className="flex items-center gap-3"><Toggle enabled={settings.notify_sound} onToggle={() => handleSaveSettings({ notify_sound: !settings.notify_sound })} /><Volume2 size={18} strokeWidth={1.5} className="text-[#8D6E63]" /><span className="text-sm font-medium text-[#3E2723] sm:text-[15px]">消息提示音</span></div>
            <p className="mt-1.5 pl-[58px] text-[11px] leading-relaxed text-[#8D6E63]/50">收到新消息时播放提示音</p>
          </Card>
          <Card className="mb-4">
            <div className="flex items-center gap-3"><Toggle enabled={settings.notify_desktop} onToggle={() => handleSaveSettings({ notify_desktop: !settings.notify_desktop })} /><Monitor size={18} strokeWidth={1.5} className="text-[#8D6E63]" /><span className="text-sm font-medium text-[#3E2723] sm:text-[15px]">桌面通知</span></div>
            <p className="mt-1.5 pl-[58px] text-[11px] leading-relaxed text-[#8D6E63]/50">在系统通知中心显示新消息提醒</p>
          </Card>
          <Card className="mb-4">
            <div className="flex items-center gap-3"><Toggle enabled={settings.notify_ai_indicator} onToggle={() => handleSaveSettings({ notify_ai_indicator: !settings.notify_ai_indicator })} /><MessageSquare size={18} strokeWidth={1.5} className="text-[#8D6E63]" /><span className="text-sm font-medium text-[#3E2723] sm:text-[15px]">AI 回复标识</span></div>
            <p className="mt-1.5 pl-[58px] text-[11px] leading-relaxed text-[#8D6E63]/50">在 AI 自动生成的消息旁显示标识标签</p>
          </Card>
          <Card className="mb-4">
            <div className="flex items-center gap-3"><Toggle enabled={settings.notify_quiet_enabled} onToggle={() => handleSaveSettings({ notify_quiet_enabled: !settings.notify_quiet_enabled })} /><Bell size={18} strokeWidth={1.5} className="text-[#8D6E63]" /><span className="text-sm font-medium text-[#3E2723] sm:text-[15px]">免打扰模式</span></div>
            {settings.notify_quiet_enabled && (
              <div className="mt-3 flex items-center gap-2 pl-[58px]">
                <input type="time" value={settings.notify_quiet_start} onChange={e => handleSaveSettings({ notify_quiet_start: e.target.value })} className="rounded-lg border border-[#EAE0D5]/60 bg-[#F7F3EE] px-2 py-1.5 text-sm text-[#3E2723] outline-none focus:border-[#C89F7E]/50" />
                <span className="text-sm text-[#8D6E63]">至</span>
                <input type="time" value={settings.notify_quiet_end} onChange={e => handleSaveSettings({ notify_quiet_end: e.target.value })} className="rounded-lg border border-[#EAE0D5]/60 bg-[#F7F3EE] px-2 py-1.5 text-sm text-[#3E2723] outline-none focus:border-[#C89F7E]/50" />
              </div>
            )}
            <p className="mt-1.5 pl-[58px] text-[11px] leading-relaxed text-[#8D6E63]/50">设定时间段内静音所有通知</p>
          </Card>
          {settingsSaved && <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600"><Check size={16} strokeWidth={2} /> 设置已保存</div>}
        </div>
      </div>
    );
  }

  if (page === "privacy") {
    return (
      <div className="flex h-full flex-col overflow-auto bg-[#F7F3EE]">
        <div className="w-full px-4 py-6 sm:px-5 sm:py-8 lg:px-6">
          <PageHeader title="隐私" onBack={() => setPage("main")} />
          <Card className="mb-4">
            <div className="flex items-center gap-3"><Toggle enabled={settings.privacy_msg_encrypt} onToggle={() => handleSaveSettings({ privacy_msg_encrypt: !settings.privacy_msg_encrypt })} /><ShieldCheck size={18} strokeWidth={1.5} className="text-[#8D6E63]" /><span className="text-sm font-medium text-[#3E2723] sm:text-[15px]">消息加密存储</span></div>
            <p className="mt-1.5 pl-[58px] text-[11px] leading-relaxed text-[#8D6E63]/50">对本地存储的消息进行加密处理</p>
          </Card>
          <Card className="mb-4">
            <div className="flex items-center gap-3"><Clock size={18} strokeWidth={1.5} className="shrink-0 text-[#8D6E63]" /><div className="flex-1"><span className="text-sm font-medium text-[#3E2723] sm:text-[15px]">自动删除消息</span></div></div>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {[{ v: "0", l: "永不" }, { v: "7", l: "7天" }, { v: "30", l: "30天" }, { v: "90", l: "90天" }].map(o => (
                <button key={o.v} onClick={() => handleSaveSettings({ privacy_auto_delete: parseInt(o.v) })} className={`rounded-xl py-2.5 text-xs font-medium transition-all sm:text-sm ${settings.privacy_auto_delete === parseInt(o.v) ? "border-2 border-[#C89F7E] bg-[#C89F7E]/10 text-[#C89F7E]" : "border border-[#EAE0D5]/60 bg-[#F7F3EE] text-[#8D6E63]"}`}>{o.l}</button>
              ))}
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-[#8D6E63]/50">超过设定时间的消息将自动清除</p>
          </Card>
          <Card className="mb-4">
            <div className="flex items-center gap-3"><Toggle enabled={settings.privacy_read_receipt} onToggle={() => handleSaveSettings({ privacy_read_receipt: !settings.privacy_read_receipt })} /><Eye size={18} strokeWidth={1.5} className="text-[#8D6E63]" /><span className="text-sm font-medium text-[#3E2723] sm:text-[15px]">已读回执</span></div>
            <p className="mt-1.5 pl-[58px] text-[11px] leading-relaxed text-[#8D6E63]/50">让对方知道你已阅读消息</p>
          </Card>
          <Card className="mb-4">
            <div className="flex items-center gap-3"><Toggle enabled={settings.privacy_show_online} onToggle={() => handleSaveSettings({ privacy_show_online: !settings.privacy_show_online })} /><EyeOff size={18} strokeWidth={1.5} className="text-[#8D6E63]" /><span className="text-sm font-medium text-[#3E2723] sm:text-[15px]">显示在线状态</span></div>
            <p className="mt-1.5 pl-[58px] text-[11px] leading-relaxed text-[#8D6E63]/50">其他用户可以看到你的在线状态</p>
          </Card>
          {settingsSaved && <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600"><Check size={16} strokeWidth={2} /> 设置已保存</div>}
        </div>
      </div>
    );
  }

  if (page === "general") {
    return (
      <div className="flex h-full flex-col overflow-auto bg-[#F7F3EE]">
        <div className="w-full px-4 py-6 sm:px-5 sm:py-8 lg:px-6">
          <PageHeader title="通用" onBack={() => setPage("main")} />
          <Card className="mb-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <SelectInput label="语言" value={settings.general_language} onChange={v => handleSaveSettings({ general_language: v })} options={[{ value: "zh-CN", label: "中文" }, { value: "en", label: "English" }]} />
              <SelectInput label="主题" value={settings.general_theme} onChange={v => handleSaveSettings({ general_theme: v })} options={[{ value: "auto", label: "跟随系统" }, { value: "light", label: "浅色模式" }, { value: "dark", label: "深色模式" }]} />
              <SelectInput label="字体大小" value={settings.general_font_size} onChange={v => handleSaveSettings({ general_font_size: v })} options={[{ value: "small", label: "小" }, { value: "normal", label: "正常" }, { value: "large", label: "大" }]} />
            </div>
          </Card>
          <Card className="mb-4">
            <div className="mb-3 flex items-center gap-3"><Download size={18} strokeWidth={1.5} className="text-[#8D6E63]" /><span className="text-sm font-medium text-[#3E2723] sm:text-[15px]">数据管理</span></div>
            <div className="flex gap-3">
              <button onClick={() => { const data = JSON.stringify(settings, null, 2); const blob = new Blob([data], { type: "application/json" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "webchat-settings.json"; a.click(); URL.revokeObjectURL(url); }} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#C89F7E]/30 bg-white px-4 py-3 text-sm font-medium text-[#C89F7E] transition-all hover:bg-[#C89F7E]/5"><Download size={16} strokeWidth={1.5} /> 导出设置</button>
              <button onClick={() => { const input = document.createElement("input"); input.type = "file"; input.accept = ".json"; input.onchange = async (e) => { const file = (e.target as HTMLInputElement).files?.[0]; if (!file) return; try { const text = await file.text(); const imported = JSON.parse(text); handleSaveSettings(imported); alert("设置已导入"); } catch { alert("导入失败，文件格式不正确"); } }; input.click(); }} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#C89F7E]/30 bg-white px-4 py-3 text-sm font-medium text-[#C89F7E] transition-all hover:bg-[#C89F7E]/5"><Upload size={16} strokeWidth={1.5} /> 导入设置</button>
            </div>
          </Card>
          <Card className="mb-4">
            <button onClick={() => { if (confirm("确认清除本地缓存？")) { try { localStorage.clear(); alert("缓存已清除"); } catch { alert("清除失败"); } } }} className="flex w-full items-center gap-3"><Trash size={18} strokeWidth={1.5} className="text-red-500" /><span className="text-sm font-medium text-red-500 sm:text-[15px]">清除本地缓存</span></button>
          </Card>
          {settingsSaved && <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600"><Check size={16} strokeWidth={2} /> 设置已保存</div>}
        </div>
      </div>
    );
  }

  if (page === "about") {
    return (
      <div className="flex h-full flex-col overflow-auto bg-[#F7F3EE]">
        <div className="w-full px-4 py-6 sm:px-5 sm:py-8 lg:px-6">
          <PageHeader title="关于" onBack={() => setPage("main")} />
          <div className="mb-6 flex flex-col items-center rounded-2xl bg-white p-6 shadow-sm sm:p-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-r from-[#C89F7E] to-[#B08968] text-2xl font-bold text-white sm:h-[72px] sm:w-[72px]">W</div>
            <div className="mt-3 text-base font-semibold text-[#3E2723] sm:text-lg">WebChat</div>
            <div className="mt-1 text-xs text-[#8D6E63] sm:text-sm">微信 Bot 管理工具</div>
            <div className="mt-2 rounded-full bg-[#C89F7E]/10 px-3 py-1 text-xs font-medium text-[#C89F7E]">v1.0.0</div>
          </div>
          <Card className="mb-4">
            <div className="mb-3 text-sm font-medium text-[#3E2723]">技术栈</div>
            <div className="flex flex-wrap gap-2">
              {[{ name: "React 18", color: "bg-blue-500/10 text-blue-600" }, { name: "TypeScript", color: "bg-sky-500/10 text-sky-600" }, { name: "Tailwind CSS", color: "bg-cyan-500/10 text-cyan-600" }, { name: "Node.js", color: "bg-green-500/10 text-green-600" }, { name: "Vite", color: "bg-purple-500/10 text-purple-600" }].map(t => <span key={t.name} className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${t.color}`}>{t.name}</span>)}
            </div>
          </Card>
          <Card className="mb-4">
            <div className="mb-3 text-sm font-medium text-[#3E2723]">功能特性</div>
            <div className="space-y-2">
              {["微信 Bot 扫码登录与消息收发", "AI 自动回复（支持多种模型）", "角色卡与技能系统", "多媒体消息支持", "定时主动问候", "运行日志与监控"].map(f => <div key={f} className="flex items-center gap-2.5"><div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500"><Check size={12} strokeWidth={2} /></div><span className="text-sm text-[#3E2723]">{f}</span></div>)}
            </div>
          </Card>
          <Card className="mb-4">
            <div className="flex items-center gap-3"><FileText size={18} strokeWidth={1.5} className="text-[#8D6E63]" /><div className="flex-1"><div className="text-sm font-medium text-[#3E2723]">开源许可</div><div className="mt-0.5 text-xs text-[#8D6E63]">MIT License</div></div></div>
          </Card>
          <div className="text-center text-[11px] text-[#8D6E63]/40">Made with ❤️</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-auto bg-[#F7F3EE]">
      <div className="w-full px-4 py-6 sm:px-5 sm:py-8 lg:px-6">
        <h1 className="mb-1 text-xl font-semibold text-[#3E2723] sm:text-2xl">设置</h1>
        <div className="mb-6 flex items-center gap-3.5 rounded-2xl bg-white p-4 shadow-sm sm:gap-4 sm:p-5"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-[#C89F7E] to-[#B08968] text-lg font-semibold text-white sm:h-14 sm:w-14 sm:text-xl">{email ? email[0].toUpperCase() : "?"}</div><div className="min-w-0 flex-1"><div className="text-sm font-semibold text-[#3E2723] sm:text-[15px]">{email || "未登录"}</div><div className="mt-0.5 text-xs text-[#8D6E63] sm:text-[13px]">微信 Bot 账号</div></div><ChevronRight size={18} strokeWidth={1.5} className="shrink-0 text-[#8D6E63]/30" /></div>
        <div className="overflow-hidden rounded-2xl bg-[#EAE0D5]/30">
          <SettingRow icon={Shield} label="账号与安全" onClick={() => setPage("account")} />
          <SettingRow icon={BookOpen} label="角色卡" onClick={() => setPage("personas")} badge={personas.length} />
          <SettingRow icon={MessageSquare} label="AI 自动回复" onClick={() => setPage("ai")} />
          <SettingRow icon={AlertTriangle} label="运行日志" onClick={() => setPage("logs")} />
          <SettingRow icon={Zap} label="功能选项" onClick={() => setPage("features")} badge="11" />
          {[{ icon: Bell, label: "消息通知", page: "notifications" as const }, { icon: Lock, label: "隐私", page: "privacy" as const }, { icon: Sliders, label: "通用", page: "general" as const }, { icon: Info, label: "关于", page: "about" as const }].map((item) => (<SettingRow key={item.page} icon={item.icon} label={item.label} onClick={() => setPage(item.page)} />))}
        </div>
        <button onClick={onLogout} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-red-500/5 px-4 py-3.5 text-sm font-medium text-red-500 transition-all hover:bg-red-500/10 sm:mt-8"><LogOut size={16} strokeWidth={1.5} /> 退出登录</button>
      </div>
    </div>
  );
}
