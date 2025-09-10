import { useEffect, useRef, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bot, MessageCircle, Thermometer, Syringe, Ambulance, HelpCircle, RotateCcw, AlertTriangle, Keyboard } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { fetchAIReply } from "@/lib/ai";
import { useLanguage } from "@/contexts/LanguageContext";

interface ChatMessage {
  id: string;
  role: 'user' | 'bot';
  content: string;
  meta?: Record<string, any>;
}

const QUICK_INTENTS = [
  { id: 'fever', label: 'Fever', icon: Thermometer, sample: 'I have mild fever and body ache' },
  { id: 'vaccine', label: 'Vaccination', icon: Syringe, sample: 'When should I take my next vaccine?' },
  { id: 'emergency', label: 'Emergency', icon: Ambulance, sample: 'Chest pain and sweating' },
  { id: 'general', label: 'General Health', icon: HelpCircle, sample: 'How to stay healthy?' }
];

const STORAGE_KEY = 'chatbot_conversation_v1';

function formatTriageBadge(_triage?: string) { return null; }

export default function Chatbot() {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch {}
    return [{ id: 'welcome', role: 'bot', content: 'Hello! I\'m your health assistant. You can ask about fever, vaccines, booking appointments, or medicine availability. This is not a substitute for professional diagnosis. In emergencies call local services (108).' }];
  });
  const [input, setInput] = useState('');
  // removed local medicine / intent flow
  const listRef = useRef<HTMLDivElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showHindiKeyboard, setShowHindiKeyboard] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const { currentLanguage } = useLanguage();
  // always AI
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [enableVoiceReplies, setEnableVoiceReplies] = useState(false);
  const recognitionRef = useRef<any>(null);
  const hindiChars = ['अ','आ','इ','ई','उ','ऊ','ए','ऐ','ओ','औ','क','ख','ग','घ','च','छ','ज','झ','ट','ठ','ड','ढ','त','थ','द','ध','न','प','फ','ब','भ','म','य','र','ल','व','श','ष','स','ह','ऋ','ँ','ं','ः','।'];

  // Pharmacies for medicine availability queries
  const { data: pharmacies } = useQuery<any[]>({ queryKey: ['/api/pharmacies'] });

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages)); } catch {}
  }, [messages]);

  // Speak bot replies (Hindi if current message appears to contain Devanagari, else English)
  useEffect(() => {
    if (!enableVoiceReplies) return;
    if (!('speechSynthesis' in window)) return;
    const last = messages[messages.length - 1];
    if (!last || last.role !== 'bot') return;
    const utter = new SpeechSynthesisUtterance(last.content);
    // Detect if message has Devanagari chars
    const hasHindi = /[\u0900-\u097F]/.test(last.content);
    utter.lang = hasHindi ? 'hi-IN' : 'en-US';
    utter.rate = 1;
    utter.pitch = 1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  }, [messages, enableVoiceReplies]);

  // Setup / get recognition instance lazily
  const getRecognition = () => {
    if (recognitionRef.current) return recognitionRef.current;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return null;
    const rec = new SpeechRecognition();
    rec.lang = 'hi-IN';
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;
    rec.onstart = () => { setIsListening(true); setVoiceError(null); };
    rec.onerror = (e: any) => { setVoiceError(e.error || 'error'); setIsListening(false); };
    rec.onend = () => { setIsListening(false); };
    rec.onresult = (e: any) => {
      let interim = '';
      let final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const transcript = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += transcript; else interim += transcript;
      }
      if (interim) setInput(interim);
      if (final) {
        setInput(final.trim());
        // Auto submit after small delay for natural feel
        setTimeout(() => { handleSubmit(); }, 200);
      }
    };
    recognitionRef.current = rec;
    return rec;
  };

  const toggleHindiListening = () => {
    const rec = getRecognition();
    if (!rec) { setVoiceError('not-supported'); return; }
    if (isListening) {
      try { rec.stop(); } catch {}
      return;
    }
    // Clear current input placeholder
    setInput('');
    setVoiceError(null);
    try { rec.start(); } catch (e: any) { setVoiceError(e.message || 'error'); }
  };

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  const pushMessage = useCallback((m: Omit<ChatMessage, 'id'>) => {
    setMessages(prev => [...prev, { id: crypto.randomUUID(), ...m }]);
  }, []);

  const handleQuickIntent = (sample: string) => {
    setInput(sample);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = input.trim();
    if (!text || isProcessing) return;
    setIsProcessing(true);
    pushMessage({ role: 'user', content: text });
    setInput('');

    fetchAIReply([...messages, { role: 'user', content: text }], currentLanguage)
      .then(r => { pushMessage({ role: 'bot', content: r.reply }); })
      .catch(e => { pushMessage({ role: 'bot', content: 'AI error: ' + (e.message || 'unknown') }); })
      .finally(() => setIsProcessing(false));
  };

  const resetChat = () => {
  setMessages([{ id: 'welcome', role: 'bot', content: 'Conversation cleared. Ask me anything about symptoms, vaccines, medicines or appointments.' }]);
  };

  const appendChar = (ch: string) => { setInput(prev => prev + ch); };

  return (
    <Card className="bg-card flex flex-col h-full max-h-[560px] min-h-[480px] w-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center space-x-3">
          <Bot className="text-primary text-2xl" />
          <span>{t("healthAssistant") || 'Health Assistant'}</span>
        </CardTitle>
        <div className="flex flex-wrap gap-2 pt-3">
          {QUICK_INTENTS.map(q => {
            const Icon = q.icon;
            return (
              <Button key={q.id} size="sm" variant="secondary" className="text-xs" onClick={() => handleQuickIntent(q.sample)}>
                <Icon className="w-3 h-3 mr-1" />{q.label}
              </Button>
            );
          })}
          <Button size="sm" variant="outline" onClick={resetChat} title="Reset conversation">
            <RotateCcw className="w-3 h-3 mr-1"/>Reset
          </Button>
        </div>
        <div className="flex gap-2 pt-2">
          <Button type="button" size="sm" variant={showHindiKeyboard ? 'default':'outline'} onClick={() => setShowHindiKeyboard(s=>!s)} className="text-xs">
            <Keyboard className="w-3 h-3 mr-1"/>हिन्दी
          </Button>
          <Button type="button" size="sm" variant={isListening ? 'default':'outline'} onClick={toggleHindiListening} className={`text-xs ${isListening ? 'animate-pulse' : ''}`}>{isListening ? '⏹️ ' + t('stopListening', { defaultValue: 'Stop' }) : '🎤 ' + t('speakHindi', { defaultValue: 'Speak in Hindi' })}</Button>
          <Button type="button" size="sm" variant={enableVoiceReplies ? 'default':'outline'} onClick={() => setEnableVoiceReplies(v=>!v)} className="text-xs">{enableVoiceReplies ? '🔊 On' : '🔊 Off'}</Button>
        </div>
        {voiceError === 'not-supported' && (
          <p className="text-[10px] text-amber-600 mt-1">{t('voiceNotSupported', { defaultValue: 'Browser does not support Hindi speech recognition.' })}</p>
        )}
        {isListening && <p className="text-[10px] text-emerald-600 mt-1">{t('listening', { defaultValue: 'Listening...' })}</p>}
      </CardHeader>
      <CardContent className="flex flex-col flex-1 overflow-hidden">
        <div ref={listRef} className="flex-1 overflow-y-auto pr-1 space-y-3 mb-4 text-sm">
          {messages.map(m => (
            <div key={m.id} className={`rounded-lg p-3 border ${m.role === 'user' ? 'bg-primary text-primary-foreground ml-auto max-w-[80%]' : 'bg-muted mr-auto max-w-[85%]' }`}>
              {m.meta?.intent && (
                <div className="flex items-center justify-between mb-1 text-[10px] opacity-70">
                  <span className="capitalize">{m.meta.intent}</span>
                  {formatTriageBadge(m.meta.triage)}
                </div>
              )}
              <div className="whitespace-pre-line leading-relaxed">{m.content}</div>
            </div>
          ))}
        </div>
        <form onSubmit={handleSubmit} className="space-y-2 mt-auto">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={'Type your message...'}
              disabled={isProcessing}
            />
            <Button type="submit" disabled={!input.trim() || isProcessing}>
              <MessageCircle className="w-4 h-4 mr-1"/>{isProcessing ? '...' : 'Send'}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> Not a substitute for professional medical advice or emergency services.</p>
        </form>
        {showHindiKeyboard && (
          <div className="grid grid-cols-10 gap-1 mt-2 p-2 border rounded bg-muted/50 max-h-32 overflow-y-auto text-sm">
            {hindiChars.map(c => (
              <button type="button" key={c} onClick={() => appendChar(c)} className="px-1 py-1 bg-background border rounded hover:bg-accent">
                {c}
              </button>
            ))}
            <button type="button" onClick={() => setInput(p=>p.slice(0,-1))} className="col-span-2 px-1 py-1 bg-destructive text-destructive-foreground rounded">⌫</button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
