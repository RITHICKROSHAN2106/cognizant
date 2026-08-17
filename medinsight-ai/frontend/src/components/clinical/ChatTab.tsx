import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, User, Sparkles, AlertCircle, ShieldAlert, Loader2, RefreshCw } from 'lucide-react';
import { patientService } from '../../services/patientService';
import { Patient, ChatMessage } from '../../types/clinical';

interface ChatTabProps {
  patient: Patient;
}

export const ChatTab: React.FC<ChatTabProps> = ({ patient }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: `Hello, I am MedInsight Clinical AI. I have authorized access to **${patient.first_name} ${patient.last_name}**'s records (MRN: ${patient.mrn}). Ask me any questions about their medications, diagnostic labs, allergy contraindications, or 30-day readmission risk factors.`
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [modelName, setModelName] = useState<string>('Google Gemini');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const quickPrompts = [
    "What active medications is this patient taking?",
    "Check for any severe allergy contraindications",
    "Summarize recent diagnostic lab results and vitals",
    "What are the top drivers for this patient's readmission risk?",
    "Give me a 3-bullet clinical summary of this admission"
  ];

  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || inputMessage;
    if (!query.trim() || loading) return;

    const userMsg: ChatMessage = { role: 'user', content: query.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setLoading(true);

    try {
      const response = await patientService.chatWithPatient(patient.id, query, messages);
      setModelName(response.model || 'Google Gemini');
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: response.reply }
      ]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `⚠️ **Clinical AI Service Notice**: Unable to generate real-time response. (${err?.response?.data?.error?.message || err?.message || 'Network error'})`
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[720px]">
      {/* Chat Header */}
      <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white">Patient Intelligence Copilot</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" />
                {modelName}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Strictly scoped to <span className="text-cyan-300 font-medium">{patient.first_name} {patient.last_name} ({patient.mrn})</span> — No cross-patient data leakage.
            </p>
          </div>
        </div>

        <button
          onClick={() => setMessages([
            {
              role: 'assistant',
              content: `Conversation reset. Asking about **${patient.first_name} ${patient.last_name}** (MRN: ${patient.mrn}). How can I assist you?`
            }
          ])}
          className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          title="Clear chat history"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, index) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={index}
              className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!isUser && (
                <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300 shrink-0 mt-1">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-2xl rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  isUser
                    ? 'bg-cyan-600 text-white rounded-br-none shadow-md shadow-cyan-600/20'
                    : 'bg-slate-800/90 border border-slate-700/70 text-slate-200 rounded-bl-none shadow-lg'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>
              </div>

              {isUser && (
                <div className="w-8 h-8 rounded-lg bg-cyan-600/30 border border-cyan-500/40 flex items-center justify-center text-cyan-300 shrink-0 mt-1">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          );
        })}

        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300 shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-slate-800/90 border border-slate-700/70 rounded-2xl rounded-bl-none px-4 py-3 text-sm text-slate-300 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
              <span>Analyzing patient EHR records in MongoDB with Gemini AI...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Prompts */}
      <div className="px-4 py-2 bg-slate-950/40 border-t border-slate-800/80 flex items-center gap-2 overflow-x-auto">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0">
          Suggested:
        </span>
        {quickPrompts.map((prompt, i) => (
          <button
            key={i}
            onClick={() => handleSendMessage(prompt)}
            disabled={loading}
            className="text-xs px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 hover:text-cyan-300 hover:border-cyan-500/50 whitespace-nowrap transition"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-slate-950 border-t border-slate-800 space-y-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            disabled={loading}
            placeholder={`Ask anything about ${patient.first_name}'s medical records...`}
            className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-sm"
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || loading}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-medium disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition"
          >
            <Send className="w-4 h-4" />
            <span>Send</span>
          </button>
        </form>

        <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
          <span className="flex items-center gap-1">
            <ShieldAlert className="w-3 h-3 text-amber-400" />
            Clinical Decision Support Assistant • Not an independent diagnostic device.
          </span>
          <span>MongoDB Authorized EHR Context</span>
        </div>
      </div>
    </div>
  );
};
