import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Keyboard, Smile, Plus, Send, Image, FileText, Camera, MapPin } from 'lucide-react';

interface Props {
  onSendText: (text: string) => void;
  onSendVoice: (blob?: Blob) => void;
  onSendImage: (file: File) => void;
  onSendFile: (file: File) => void;
  onSendLocation: (lat: number, lng: number) => void;
}

const iconBg = (c: string) => `linear-gradient(135deg, ${c}, ${c}dd)`;

export default function InputArea({ onSendText, onSendVoice, onSendImage, onSendFile, onSendLocation }: Props) {
  const [mode, setMode] = useState<'text'|'voice'>('text');
  const [text, setText] = useState('');
  const [showMore, setShowMore] = useState(false);
  const [recording, setRecording] = useState(false);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const imgInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);

  const handleSend = useCallback(() => { if (!text.trim()) return; onSendText(text.trim()); setText('') }, [text, onSendText]);
  const handleKey = useCallback((e: React.KeyboardEvent) => { if (e.key==='Enter'&&!e.shiftKey) { e.preventDefault(); handleSend() } }, [handleSend]);

  /* === Voice Recording === */
  const startRecording = useCallback(async () => {
    timer.current = setTimeout(() => setRecording(true), 200);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRecorder.current = mr;
      chunks.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunks.current.push(e.data) };
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunks.current, { type: 'audio/webm' });
        if (blob.size > 0) onSendVoice(blob);
      };
      mr.start();
    } catch {}
  }, [onSendVoice]);

  const stopRecording = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    if (recording && mediaRecorder.current?.state === 'recording') {
      mediaRecorder.current.stop();
    }
    setRecording(false);
  }, [recording]);

  /* === Media handlers === */
  const handleImagePick = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    onSendImage(f); setShowMore(false); e.target.value = '';
  }, [onSendImage]);

  const handleFilePick = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    onSendFile(f); setShowMore(false); e.target.value = '';
  }, [onSendFile]);

  const handleCameraCapture = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    onSendImage(f); setShowMore(false); e.target.value = '';
  }, [onSendImage]);

  const handleLocation = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => { onSendLocation(pos.coords.latitude, pos.coords.longitude); setShowMore(false); },
        () => alert('无法获取位置，请检查定位权限'),
      );
    } else alert('当前浏览器不支持定位');
  }, [onSendLocation]);

  const moreItems = [
    { icon: Image, label: '照片', color: '#C89F7E', action: () => imgInput.current?.click() },
    { icon: FileText, label: '文件', color: '#B08968', action: () => fileInput.current?.click() },
    { icon: Camera, label: '相机', color: '#A67C52', action: () => cameraInput.current?.click() },
    { icon: MapPin, label: '位置', color: '#8D6E63', action: handleLocation },
  ];

  return (<>
    <input ref={imgInput} type="file" accept="image/*" onChange={handleImagePick} style={{display:'none'}} />
    <input ref={fileInput} type="file" onChange={handleFilePick} style={{display:'none'}} />
    <input ref={cameraInput} type="file" accept="image/*" capture="environment" onChange={handleCameraCapture} style={{display:'none'}} />

    <div style={{borderTop:'1px solid rgba(234,224,213,0.6)',background:'white',padding:'10px 12px calc(env(safe-area-inset-bottom,8px))'}}>
      <div style={{display:'flex',alignItems:'flex-end',gap:8}}>
        <button onClick={()=>setMode(m=>m==='text'?'voice':'text')}
          style={{width:36,height:36,display:'flex',alignItems:'center',justifyContent:'center',borderRadius:12,border:'none',background:'none',cursor:'pointer',color:'#8D6E63',flexShrink:0}}>
          {mode==='text' ? <Mic size={20} strokeWidth={1.5}/> : <Keyboard size={20} strokeWidth={1.5}/>}
        </button>
        {mode==='text' ? (
          <div style={{flex:1,display:'flex',alignItems:'center',borderRadius:14,background:'#F7F3EE',padding:'0 12px'}}>
            <input value={text} onChange={e=>setText(e.target.value)} onKeyDown={handleKey}
              placeholder="输入消息..." style={{flex:1,border:'none',background:'none',padding:'8px 0',fontSize:15,color:'#3E2723',outline:'none'}}/>
            <Smile size={18} strokeWidth={1.5} style={{color:'#8D6E63',flexShrink:0}}/>
          </div>
        ) : (
          <button onMouseDown={startRecording} onMouseUp={stopRecording} onTouchStart={startRecording} onTouchEnd={stopRecording}
            style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',borderRadius:14,background:'#F7F3EE',padding:'10px 0',fontSize:14,fontWeight:500,color:'#8D6E63',border:'none',cursor:'pointer',userSelect:'none',transition:'all 0.15s'}}>
            按住 说话
          </button>
        )}
        {mode==='text' && text.trim() ? (
          <button onClick={handleSend}
            style={{width:36,height:36,display:'flex',alignItems:'center',justifyContent:'center',borderRadius:12,border:'none',cursor:'pointer',color:'white',background:iconBg('#C89F7E'),flexShrink:0}}>
            <Send size={16} strokeWidth={2}/>
          </button>
        ) : mode==='text' ? (
          <button onClick={()=>setShowMore(s=>!s)}
            style={{width:36,height:36,display:'flex',alignItems:'center',justifyContent:'center',borderRadius:12,border:'none',cursor:'pointer',color:'#8D6E63',background:'none',flexShrink:0}}>
            <Plus size={22} strokeWidth={1.5}/>
          </button>
        ) : null}
      </div>

      {/* More panel */}
      <AnimatePresence>{showMore && <motion.div initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}} style={{overflow:'hidden'}}>
        <div style={{display:'flex',gap:16,padding:'12px 4px'}}>
          {moreItems.map((item,i)=>(
            <button key={i} onClick={item.action}
              style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6,border:'none',background:'none',cursor:'pointer',transition:'all 0.15s'}}>
              <div style={{width:56,height:56,display:'flex',alignItems:'center',justifyContent:'center',borderRadius:16,color:'white',boxShadow:'0 4px 12px rgba(0,0,0,0.1)',background:iconBg(item.color)}}>
                <item.icon size={22} strokeWidth={1.5}/>
              </div>
              <span style={{fontSize:11,fontWeight:500,color:'#8D6E63'}}>{item.label}</span>
            </button>
          ))}
        </div>
      </motion.div>}</AnimatePresence>
    </div>

    {/* Voice recording overlay - centered */}
    <AnimatePresence>{recording && <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
      style={{position:'fixed',inset:0,zIndex:999,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,0.2)',backdropFilter:'blur(4px)'}}
      onMouseUp={stopRecording} onTouchEnd={stopRecording}>
      <motion.div initial={{scale:0.8}} animate={{scale:1}} exit={{scale:0.8}}
        style={{display:'flex',flexDirection:'column',alignItems:'center',gap:16,borderRadius:32,background:'white',padding:'40px 48px',boxShadow:'0 20px 60px rgba(0,0,0,0.15)'}}>
        {/* Voice wave animation */}
        <div style={{display:'flex',alignItems:'flex-end',gap:4,height:48}}>
          {[4,8,14,20,26,20,14,8,4].map((h,i)=>(
            <motion.div key={i} animate={{height:[6,h,6]}} transition={{repeat:Infinity,duration:0.6,delay:i*0.08}}
              style={{width:6,borderRadius:3,background:'linear-gradient(180deg,#C89F7E,#B08968)'}}/>
          ))}
        </div>
        <p style={{fontSize:16,fontWeight:500,color:'#3E2723'}}>正在录音...</p>
        <p style={{fontSize:13,color:'#8D6E63'}}>松开 结束</p>
      </motion.div>
    </motion.div>}</AnimatePresence>
  </>);
}
