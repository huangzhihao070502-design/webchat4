import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Smartphone, CheckCircle, Loader, RefreshCw, Bot, ScanLine, ArrowRight, ShieldCheck, Wifi } from 'lucide-react';
import MeshBackground from './MeshBackground';

const API = '';

interface Props { onConnected: () => void; onLogout: () => void }

/* ---- shared spring variants ---- */
const fadeUp = { initial: { opacity: 0, y: 24 }, animate: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 80, damping: 16, mass: 0.8 } } };
const scaleIn = { initial: { opacity: 0, scale: 0.92 }, animate: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 100, damping: 14 } } };

export default function QRConnect({ onConnected, onLogout }: Props) {
  const [qrUrl, setQrUrl] = useState('');
  const [qrKey, setQrKey] = useState('');
  const [qrImgUrl, setQrImgUrl] = useState('');
  const [status, setStatus] = useState<'loading'|'already'|'waiting'|'scaned'|'connected'|'error'>('loading');
  const [botId, setBotId] = useState('');

  const checkConnection = useCallback(async () => {
    try { const r = await fetch(`${API}/api/status`); const d = await r.json(); if (d.connected) { setBotId(d.bot_id||''); setStatus('already'); return true } } catch {}
    return false;
  }, []);

  const fetchQr = useCallback(async () => {
    setStatus('loading');
    try { const r = await fetch(`${API}/api/qrcode`); const d = await r.json(); if (d.success) { setQrUrl(d.qrcode_img_url); setQrKey(d.qrcode_key); setQrImgUrl(`/api/qrcode-image?t=${Date.now()}`); setStatus('waiting') } else setStatus('error') }
    catch { setStatus('error') }
  }, []);

  useEffect(() => { checkConnection().then(a => { if (!a) fetchQr() }) }, [checkConnection, fetchQr]);

  useEffect(() => {
    if (!qrKey || status === 'connected' || status === 'already' || status === 'error') return;
    const t = setInterval(async () => {
      try { const r = await fetch(`${API}/api/qrcode-status?key=${qrKey}`); const d = await r.json();
        if (d.status === 'scaned') setStatus('scaned');
        else if (d.connected) { setBotId(d.bot_id||''); setStatus('connected'); setTimeout(()=>onConnected(), 1200) }
        else if (d.status === 'expired') setStatus('error');
      } catch {}
    }, 1500);
    return () => clearInterval(t);
  }, [qrKey, status, onConnected]);

  const shortId = (s: string) => s.length > 12 ? s.slice(0,8)+'...'+s.slice(-6) : s;

  /* ---- shared icon box style ---- */
  const iconBox = (colors: string, shadow: string) => ({
    background: colors,
    boxShadow: shadow,
  });

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f5f0eb] font-sans">
      <MeshBackground />

      {/* ---- Logout ---- */}
      <button onClick={onLogout}
        className="fixed right-6 top-6 z-50 rounded-xl border border-white/60 bg-white/60 px-4 py-2 text-[13px] font-medium text-[#6b6b80] backdrop-blur-md transition-all hover:bg-white/90 hover:text-[#2d2b55]">
        退出登录
      </button>

      <main className="relative z-10 flex min-h-screen items-center justify-center px-5 py-12 sm:px-6">

        {/* ====== ALREADY CONNECTED ====== */}
        <AnimatePresence mode="wait">
        {status === 'already' && (
          <motion.div key="already" {...scaleIn} className="w-full max-w-[420px] text-center">
            {/* Large icon */}
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 140, damping: 12, delay: 0.1 }}
              className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-[32px]"
              style={iconBox('linear-gradient(135deg, #059669 0%, #10b981 100%)', '0 12px 40px rgba(5,150,105,0.35), 0 4px 12px rgba(5,150,105,0.2)')}>
              <ShieldCheck size={40} className="text-white" />
            </motion.div>

            <motion.h1 {...fadeUp} transition={{ delay: 0.2 }} className="text-[30px] font-light tracking-[-0.03em] text-[#1a1a2e]">已连接</motion.h1>
            <motion.p {...fadeUp} transition={{ delay: 0.3 }} className="mt-2 text-[15px] text-[#8a8a9a]">微信 Bot 正在运行中</motion.p>

            {/* Bot info card */}
            <motion.div {...fadeUp} transition={{ delay: 0.4 }}
              className="mx-auto mt-8 inline-flex items-center gap-3 rounded-2xl border border-white/70 bg-white/60 px-5 py-3.5 shadow-sm backdrop-blur-md">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#2d2b55] shadow-sm">
                <Bot size={18} className="text-white" />
              </div>
              <div className="text-left">
                <p className="text-[11px] font-medium tracking-wider text-[#8a8a9a] uppercase">BOT ID</p>
                <p className="text-[14px] font-medium text-[#1a1a2e] font-mono">{shortId(botId)}</p>
              </div>
              <span className="ml-2 flex h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(5,150,105,0.4)]" />
            </motion.div>

            <motion.button onClick={onConnected} whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.97 }}
              {...fadeUp} transition={{ delay: 0.5 }}
              className="mt-10 inline-flex h-12 items-center gap-2.5 rounded-xl bg-[#2d2b55] px-7 text-[15px] font-medium text-white shadow-lg shadow-[#2d2b55]/25 transition-all hover:bg-[#4a488a] active:shadow-md">
              进入聊天界面
              <ArrowRight size={16} strokeWidth={1.5} />
            </motion.button>
          </motion.div>
        )}

        {/* ====== LOADING ====== */}
        {status === 'loading' && (
          <motion.div key="loading" {...scaleIn} className="text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-3xl"
              style={iconBox('linear-gradient(135deg, #2d2b55 0%, #4a488a 50%, #625f9a 100%)', '0 8px 32px rgba(45,43,85,0.3)')}>
              <Loader size={26} className="animate-spin text-white" />
            </div>
            <h1 className="text-[26px] font-light tracking-[-0.02em] text-[#1a1a2e]">连接微信</h1>
            <p className="mt-2 text-[15px] text-[#8a8a9a]">正在准备二维码...</p>
          </motion.div>
        )}

        {/* ====== QR CODE ====== */}
        {status === 'waiting' && (
          <motion.div key="waiting" {...scaleIn} className="w-full max-w-[400px]">
            <div className="text-center">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 140, damping: 12 }}
                className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-3xl"
                style={iconBox('linear-gradient(135deg, #2d2b55 0%, #4a488a 50%, #625f9a 100%)', '0 8px 32px rgba(45,43,85,0.3)')}>
                <ScanLine size={26} className="text-white" />
              </motion.div>
              <h1 className="text-[26px] font-light tracking-[-0.02em] text-[#1a1a2e]">连接微信</h1>
              <p className="mt-2 text-[15px] text-[#8a8a9a]">使用微信扫描下方二维码</p>
            </div>

            {/* QR card */}
            <div className="mx-auto mt-8 w-[260px]">
              <div className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-lg backdrop-blur-xl"
                style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.02), 0 8px 24px rgba(0,0,0,0.04), 0 32px 64px rgba(0,0,0,0.06), inset 0 1px 1px rgba(255,255,255,0.6)' }}>
                <img src={qrImgUrl} alt="微信二维码" className="block h-full w-full" />
              </div>
            </div>

            {/* Steps */}
            <div className="mx-auto mt-8 max-w-[280px] space-y-3">
              {[{ n: '1', t: '打开微信' }, { n: '2', t: '点击「发现」→「扫一扫」' }, { n: '3', t: '扫描二维码确认连接' }].map((s, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + i * 0.12, type: 'spring', stiffness: 120, damping: 14 }}
                  className="flex items-center gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#2d2b55]/10 text-[12px] font-semibold text-[#2d2b55]">{s.n}</span>
                  <span className="text-[13px] text-[#8a8a9a]">{s.t}</span>
                </motion.div>
              ))}
            </div>

            <motion.button onClick={fetchQr} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
              className="mt-8 text-[12px] text-[#b0b0ba] underline underline-offset-4 decoration-dotted transition-colors hover:text-[#8a8a9a]">
              二维码失效？点击刷新
            </motion.button>
          </motion.div>
        )}

        {/* ====== SCANED ====== */}
        {status === 'scaned' && (
          <motion.div key="scaned" {...scaleIn} className="text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-3xl"
              style={iconBox('linear-gradient(135deg, #d97706 0%, #f59e0b 100%)', '0 8px 32px rgba(217,119,6,0.3)')}>
              <motion.div animate={{ rotate: [0, -10, 10, -10, 0] }} transition={{ repeat: Infinity, duration: 2 }}
                className="flex items-center justify-center">
                <Smartphone size={26} className="text-white" />
              </motion.div>
            </div>
            <h1 className="text-[26px] font-light tracking-[-0.02em] text-[#1a1a2e]">已扫码</h1>
            <p className="mt-2 text-[15px] text-[#8a8a9a]">请在手机上确认连接</p>
            <div className="mx-auto mt-10 flex items-center justify-center gap-3">
              {[0,1,2].map(i => (
                <motion.div key={i} animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.2, 0.8] }}
                  transition={{ repeat: Infinity, duration: 1.6, delay: i * 0.3 }}
                  className="h-3 w-3 rounded-full bg-amber-400" />
              ))}
            </div>
          </motion.div>
        )}

        {/* ====== CONNECTED ====== */}
        {status === 'connected' && (
          <motion.div key="connected" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-[400px] text-center">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 140, damping: 12 }}
              className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-[32px]"
              style={iconBox('linear-gradient(135deg, #059669 0%, #10b981 100%)', '0 12px 40px rgba(5,150,105,0.35)')}>
              <CheckCircle size={40} className="text-white" />
            </motion.div>
            <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-[28px] font-light text-[#1a1a2e]">连接成功</motion.h1>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="mt-2 text-[15px] text-[#8a8a9a]">正在进入聊天界面...</motion.p>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="mx-auto mt-10 flex gap-2">
              {[0,1,2].map(i => (
                <motion.div key={i} animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 0.7, delay: i * 0.18 }}
                  className="h-3 w-3 rounded-full bg-emerald-500" />
              ))}
            </motion.div>
          </motion.div>
        )}

        {/* ====== ERROR ====== */}
        {status === 'error' && (
          <motion.div key="error" {...scaleIn} className="text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-3xl border border-red-200 bg-red-50/60 shadow-sm">
              <Wifi size={26} className="text-red-400" />
            </div>
            <h1 className="text-[26px] font-light text-[#1a1a2e]">连接失败</h1>
            <p className="mt-2 text-[15px] text-[#8a8a9a]">无法获取二维码，请检查网络后重试</p>
            <button onClick={fetchQr} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              className="mx-auto mt-8 inline-flex h-11 items-center gap-2 rounded-xl bg-[#2d2b55] px-6 text-[14px] font-medium text-white shadow-lg shadow-[#2d2b55]/20 transition-all hover:bg-[#4a488a]">
              <RefreshCw size={15} /> 重新连接
            </button>
          </motion.div>
        )}
        </AnimatePresence>

      </main>
    </div>
  );
}
