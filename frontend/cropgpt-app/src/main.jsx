import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Activity, ArrowLeft, BarChart3, CalendarDays, Droplets, FileDown, FileText, FlaskConical, Leaf, Menu, PanelLeftClose, PanelLeftOpen, Plus, Send, ShieldCheck, Sprout, Trash2, X } from 'lucide-react';
import { downloadReport, sendChat } from './services/api';
import './styles.css';

const copy = {
  en: {
    title: 'Your Agricultural AI Assistant',
    sub: 'Ask about crops, seeds, soil, irrigation, plant diseases, and farming practices.',
    newChat: 'New Chat',
    home: 'Back to Home',
    clear: 'Clear conversation',
    language: 'हिन्दी',
    placeholder: 'Ask about your farm, crops, or soil…',
    welcome: 'How can I help your farm today?',
    welcomeSub: 'Get practical guidance on crops, soil, irrigation, plant diseases, and farming.',
    sources: 'Sources',
    retry: 'Retry',
    report: 'Download PDF report',
    reportHint: 'Ask a question first to create a report from this conversation.',
    empty: 'No saved conversations',
    openSidebar: 'Open sidebar',
    closeSidebar: 'Collapse sidebar',
    expandSidebar: 'Expand sidebar',
    loading: 'CropGPT is thinking…',
    modulesTitle: 'AGRICULTURAL MODULES',
    activeModule: 'Active module',
    modules: [
      { id: 'seed-identification', title: 'Seed Identification', icon: FlaskConical, prompts: ['Tell me more about my identified seed.', 'What growing conditions are suitable for this seed?', 'How should I store these seeds?'] },
      { id: 'crop-recommendation', title: 'Crop Recommendation', icon: Sprout, prompts: ['Explain my recommended crop.', 'Why was this crop recommended?', 'What growing conditions does this crop need?'] },
      { id: 'disease-detection', title: 'Disease Detection', icon: ShieldCheck, prompts: ['Explain my disease detection result.', 'What are the common symptoms of this disease?', 'How can I reduce the risk of this disease?'] },
      { id: 'yield-prediction', title: 'Yield Prediction', icon: BarChart3, prompts: ['Explain my predicted crop yield.', 'Which factors can affect crop yield?', 'What farming practices may help improve yield?'] },
    ],
    suggestions: [
      { title: 'Crop Varieties & Selection', prompt: 'What crop varieties are suitable for different growing conditions?', icon: Sprout },
      { title: 'Crop Diseases & Prevention', prompt: 'What are common symptoms of crop diseases, and how can they be prevented?', icon: Activity },
      { title: 'Irrigation Guidance', prompt: 'How should I manage irrigation for my crop?', icon: Droplets },
      { title: 'Soil Health & Nutrients', prompt: 'How can I improve soil health and manage soil nutrients?', icon: FlaskConical },
      { title: 'Seasonal Farming Advice', prompt: 'What should I consider before sowing a crop this season?', icon: CalendarDays },
    ],
  },
  hi: {
    title: 'आपका कृषि AI सहायक',
    sub: 'फसल, बीज, मिट्टी, सिंचाई, पौधों की बीमारियों और खेती के बारे में पूछें।',
    newChat: 'नई बातचीत',
    home: 'होम पर जाएँ',
    clear: 'बातचीत साफ़ करें',
    language: 'English',
    placeholder: 'अपने खेत, फसल या मिट्टी के बारे में पूछें…',
    welcome: 'आज मैं आपके खेत में कैसे मदद करूँ?',
    welcomeSub: 'फसल, मिट्टी, सिंचाई, पौधों की बीमारियों और खेती के लिए व्यावहारिक सलाह पाएँ।',
    sources: 'स्रोत',
    retry: 'फिर कोशिश करें',
    report: 'PDF रिपोर्ट डाउनलोड करें',
    reportHint: 'रिपोर्ट बनाने के लिए पहले कोई सवाल पूछें।',
    empty: 'कोई सहेजी बातचीत नहीं',
    openSidebar: 'साइडबार खोलें',
    closeSidebar: 'साइडबार छोटा करें',
    expandSidebar: 'साइडबार बढ़ाएँ',
    loading: 'CropGPT उत्तर तैयार कर रहा है…',
    modulesTitle: 'कृषि मॉड्यूल',
    activeModule: 'सक्रिय मॉड्यूल',
    modules: [
      { id: 'seed-identification', title: 'बीज पहचान', icon: FlaskConical, prompts: ['मेरे पहचाने गए बीज के बारे में और बताएँ।', 'इस बीज के लिए कौन सी बढ़ने की परिस्थितियाँ उपयुक्त हैं?', 'इन बीजों को कैसे रखें?'] },
      { id: 'crop-recommendation', title: 'फसल सुझाव', icon: Sprout, prompts: ['मेरी सुझाई गई फसल के बारे में बताएँ।', 'इस फसल की सिफारिश क्यों की गई?', 'इस फसल को किन परिस्थितियों की आवश्यकता है?'] },
      { id: 'disease-detection', title: 'रोग पहचान', icon: ShieldCheck, prompts: ['मेरे रोग पहचान परिणाम को समझाएँ।', 'इस रोग के सामान्य लक्षण क्या हैं?', 'इस रोग का जोखिम कैसे कम करें?'] },
      { id: 'yield-prediction', title: 'उपज अनुमान', icon: BarChart3, prompts: ['मेरी अनुमानित उपज समझाएँ।', 'कौन से कारक उपज को प्रभावित कर सकते हैं?', 'उपज सुधारने में कौन सी खेती विधियाँ मदद कर सकती हैं?'] },
    ],
    suggestions: [
      { title: 'फसल की किस्में और चयन', prompt: 'अलग-अलग परिस्थितियों के लिए कौन सी फसल किस्में उपयुक्त हैं?', icon: Sprout },
      { title: 'फसल रोग और बचाव', prompt: 'फसल रोगों के सामान्य लक्षण क्या हैं और उनसे कैसे बचें?', icon: Activity },
      { title: 'सिंचाई मार्गदर्शन', prompt: 'मैं अपनी फसल की सिंचाई कैसे प्रबंधित करूँ?', icon: Droplets },
      { title: 'मिट्टी और पोषक तत्व', prompt: 'मिट्टी का स्वास्थ्य और पोषक तत्व कैसे सुधारें?', icon: FlaskConical },
      { title: 'मौसमी खेती सलाह', prompt: 'इस मौसम में फसल बोने से पहले किन बातों पर ध्यान दें?', icon: CalendarDays },
    ],
  },
};

function renderInline(value, keyPrefix) {
  const tokens = String(value).split(/(\*\*[^*]+\*\*|__[^_]+__|\x60[^\x60]+\x60|\*[^*]+\*)/g).filter(Boolean);
  return tokens.map((token, index) => {
    const key = keyPrefix + '-' + index;
    if ((token.startsWith('**') && token.endsWith('**')) || (token.startsWith('__') && token.endsWith('__'))) return <strong key={key}>{token.slice(2, -2)}</strong>;
    if (token.startsWith('\x60') && token.endsWith('\x60')) return <code key={key}>{token.slice(1, -1)}</code>;
    if (token.startsWith('*') && token.endsWith('*')) return <em key={key}>{token.slice(1, -1)}</em>;
    return <React.Fragment key={key}>{token}</React.Fragment>;
  });
}

function MarkdownText({ text }) {
  const lines = String(text || '').split(/\r?\n/); const blocks = []; let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) { index += 1; continue; }
    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) { const level = Math.min(6, heading[1].length); blocks.push(React.createElement('h' + level, { key: 'h-' + index }, renderInline(heading[2], 'h-' + index))); index += 1; continue; }
    if (/^[-*]\s+/.test(line)) { const items = []; while (index < lines.length && /^[-*]\s+/.test(lines[index])) { items.push(<li key={'u-' + index}>{renderInline(lines[index].replace(/^[-*]\s+/, ''), 'u-' + index)}</li>); index += 1; } blocks.push(<ul key={'ul-' + index}>{items}</ul>); continue; }
    if (/^\d+[.)]\s+/.test(line)) { const items = []; while (index < lines.length && /^\d+[.)]\s+/.test(lines[index])) { items.push(<li key={'o-' + index}>{renderInline(lines[index].replace(/^\d+[.)]\s+/, ''), 'o-' + index)}</li>); index += 1; } blocks.push(<ol key={'ol-' + index}>{items}</ol>); continue; }
    const paragraph = [line]; index += 1;
    while (index < lines.length && lines[index].trim() && !/^(#{1,6})\s+/.test(lines[index]) && !/^[-*]\s+/.test(lines[index]) && !/^\d+[.)]\s+/.test(lines[index])) { paragraph.push(lines[index]); index += 1; }
    blocks.push(<p key={'p-' + index}>{paragraph.map((part, partIndex) => <React.Fragment key={partIndex}>{partIndex > 0 && <br />}{renderInline(part, 'p-' + index + '-' + partIndex)}</React.Fragment>)}</p>);
  }
  return <div className="markdown">{blocks}</div>;
}

function App() {
  const [lang, setLang] = useState('en');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [conversationId, setConversationId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [mobile, setMobile] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [activeModule, setActiveModule] = useState(null);
  const chatRef = useRef(null);
  const lastQuestion = useRef('');
  const requestNumber = useRef(0);
  const mounted = useRef(true);
  const t = copy[lang];

  useEffect(() => {
    const chat = chatRef.current;
    if (chat) chat.scrollTo({ top: chat.scrollHeight, behavior: 'smooth' });
  }, [messages, busy]);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; requestNumber.current += 1; };
  }, []);

  const newChat = () => { requestNumber.current += 1; setMessages([]); setConversationId(null); setError(''); setActiveModule(null); setMobile(false); };
  const goHome = () => newChat();
  const selectModule = (module) => { requestNumber.current += 1; setMessages([]); setConversationId(null); setError(''); setActiveModule(module.id); setMobile(false); };

  async function send(question = input) {
    if (!question.trim() || busy) return;
    const currentRequest = ++requestNumber.current;
    lastQuestion.current = question; setInput(''); setError('');
    setMessages((items) => [...items, { role: 'user', content: question, time: new Date() }]); setBusy(true);
    try {
      const data = await sendChat({ message: question, language: lang, conversation_id: conversationId, module_id: activeModule || undefined, module_context: activeModule ? t.modules.find((item) => item.id === activeModule)?.title : undefined });
      if (!mounted.current || currentRequest !== requestNumber.current) return;
      setConversationId(data.conversation_id); setMessages((items) => [...items, { role: 'assistant', ...data, time: new Date() }]);
    } catch (e) {
      if (mounted.current && currentRequest === requestNumber.current) setError(e.message || 'The request failed. Please try again.');
    } finally {
      if (mounted.current && currentRequest === requestNumber.current) setBusy(false);
    }
  }

  async function report() {
    if (!messages.length) { setError(t.reportHint); return; }
    try {
      const blob = await downloadReport({ language: lang, guidance: null, conversation: messages.map(({ role, content, answer }) => ({ role, content: content || answer })), sources: messages.flatMap((m) => m.sources || []) });
      const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'sagrivision-ai-report.pdf'; link.click(); URL.revokeObjectURL(url);
    } catch (e) { setError(e.message || 'The report could not be generated.'); }
  }

  const toggleLabel = collapsed ? t.expandSidebar : t.closeSidebar;
  const selectedModule = activeModule ? t.modules.find((module) => module.id === activeModule) : null;
  return <div className="app">
    <aside className={(mobile ? 'open ' : '') + (collapsed ? 'collapsed' : '')}>
      <div className="sidebarTop"><div className="brand"><div className="logo"><Leaf size={19} /></div><div className="brandText"><strong>CropGPT</strong><small>SAgriVision AI</small></div></div><button className="sidebarToggle" onClick={() => setCollapsed(!collapsed)} aria-label={toggleLabel} title={toggleLabel}>{collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}</button></div>
      <button className="new" onClick={newChat} title={t.newChat}><Plus size={18} /><span>{t.newChat}</span></button>
      <div className="sideLabel moduleLabel">{t.modulesTitle}</div>
      <nav className="moduleNav" aria-label={t.modulesTitle}>{t.modules.map((module) => { const Icon = module.icon; const selected = activeModule === module.id; return <button className={'moduleItem' + (selected ? ' active' : '')} key={module.id} onClick={() => selectModule(module)} title={module.title} aria-label={module.title} aria-current={selected ? 'page' : undefined}><Icon size={17} /><span>{module.title}</span></button>; })}</nav>
      <div className="sideLabel">{lang === 'hi' ? 'बातचीत' : 'CONVERSATIONS'}</div>
      <div className="recent">{messages.length ? <button onClick={() => setMobile(false)} title="Current session"><Leaf size={15} /><span>{lang === 'hi' ? 'वर्तमान सत्र' : 'Current session'}</span></button> : <span>{t.empty}</span>}</div>
      <button className="homeButton" onClick={goHome} title={t.home} aria-label={t.home}><ArrowLeft size={17} /><span>{t.home}</span></button>
      <button className="mobileClose" onClick={() => setMobile(false)} aria-label="Close menu"><X size={18} /></button>
    </aside>
    <main>
      <header><button className="menu" onClick={() => { setCollapsed(false); setMobile(true); }} aria-label={t.openSidebar}><Menu /></button><div className="headerCopy"><span className="eyebrow">AGRICULTURAL INTELLIGENCE</span><h1>{t.title}</h1><p>{t.sub}</p></div><div className="actions"><button className="lang" onClick={() => setLang(lang === 'en' ? 'hi' : 'en')}>{t.language}</button><button className="iconBtn" title={t.clear} aria-label={t.clear} onClick={newChat}><Trash2 size={17} /></button></div></header>
      <section className="chat" ref={chatRef}>
        {selectedModule && <div className="moduleContext"><div><span>{t.activeModule}</span><strong>{selectedModule.title}</strong></div>{!messages.length && <div className="modulePrompts">{selectedModule.prompts.map((prompt) => <button key={prompt} onClick={() => send(prompt)}>{prompt}</button>)}</div>}</div>}
        {!messages.length ? <div className="welcome"><div className="heroIcon"><Leaf size={26} /></div><h2>{t.welcome}</h2><p>{t.welcomeSub}</p><div className="shortcutGrid">{t.suggestions.map((item) => { const Icon = item.icon; return <button className="shortcutCard" key={item.title} onClick={() => send(item.prompt)}><span className="shortcutIcon"><Icon size={19} /></span><span className="shortcutTitle">{item.title}</span><span className="shortcutPrompt">{item.prompt}</span></button>; })}<button className="shortcutCard reportShortcut" onClick={report}><span className="shortcutIcon"><FileText size={19} /></span><span className="shortcutTitle">{lang === 'hi' ? 'कृषि रिपोर्ट' : 'Agricultural Reports'}</span><span className="shortcutPrompt">{lang === 'hi' ? 'वर्तमान बातचीत से PDF रिपोर्ट बनाएँ' : 'Create a PDF report from this conversation'}</span></button></div></div> : <div className="messages">{messages.map((m, i) => <div className={'message ' + m.role} key={i}><div className="avatar">{m.role === 'assistant' ? <Leaf size={15} /> : 'You'}</div><div className="bubble">{m.role === 'user' ? <p>{m.content}</p> : <MarkdownText text={m.answer} />}<time>{new Date(m.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>{m.role === 'assistant' && m.topic && <div className="meta"><span>{m.topic}</span>{typeof m.relevance === 'number' && <span>Relevance: {Math.round(m.relevance * 100)}%</span>}</div>}{m.role === 'assistant' && Array.isArray(m.sources) && m.sources.length > 0 && <details><summary>{t.sources} ({m.sources.length})</summary>{m.sources.map((s, j) => <a key={s.name + '-' + j} href={s.url || undefined} target="_blank" rel="noreferrer">{s.name}</a>)}</details>}</div></div>)}{busy && <div className="message assistant"><div className="avatar"><Leaf size={15} /></div><div className="bubble typing"><i></i><i></i><i></i><span className="srOnly">{t.loading}</span></div></div>}{error && <div className="error" role="alert">{error}<button onClick={() => send(lastQuestion.current)} disabled={busy}>{t.retry}</button></div>}</div>}
      </section>
      <footer><div className="composer"><textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder={t.placeholder} rows="1" aria-label={t.placeholder} /><button onClick={() => send()} disabled={busy || !input.trim()} aria-label="Send"><Send size={18} /></button></div>{messages.length > 0 && <div className="footerRow"><span>{lang === 'hi' ? 'स्थानीय कृषि विशेषज्ञों से स्थान-विशिष्ट निर्णयों की पुष्टि करें।' : 'Verify location-specific decisions with local agricultural experts.'}</span><button onClick={report}><FileDown size={15} />{t.report}</button></div>}</footer>
    </main>
  </div>;
}

class ErrorBoundary extends React.Component { state = { hasError: false }; static getDerivedStateFromError() { return { hasError: true }; } render() { return this.state.hasError ? <div className="error" role="alert">Something went wrong while displaying this conversation. Please start a new chat.</div> : this.props.children; } }
createRoot(document.getElementById('root')).render(<ErrorBoundary><App /></ErrorBoundary>);

