import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiClient } from '../services/api';
import { Patient } from '../types/clinical';

export interface CopilotMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: string[];
  suggested_actions?: Array<{
    id: string;
    title: string;
    action_type: string;
    payload: any;
  }>;
  timestamp: string;
}

interface CopilotContextType {
  isOpen: boolean;
  openCopilot: (contextType?: string, defaultPrompt?: string) => void;
  closeCopilot: () => void;
  toggleCopilot: () => void;
  activePatient: Patient | null;
  setActivePatientContext: (patient: Patient | null, encounterId?: string | null) => void;
  activeEncounterId: string | null;
  activeContextType: string;
  setActiveContextType: (type: string) => void;
  messages: CopilotMessage[];
  isLoading: boolean;
  sendMessage: (text: string) => Promise<void>;
  clearSession: () => void;
  patientSwitchedNotice: boolean;
  dismissSwitchNotice: () => void;
}

const CopilotContext = createContext<CopilotContextType | undefined>(undefined);

export const CopilotProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activePatient, setActivePatient] = useState<Patient | null>(null);
  const [activeEncounterId, setActiveEncounterId] = useState<string | null>(null);
  const [activeContextType, setActiveContextType] = useState<string>('GENERAL_SUMMARY');
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [patientSwitchedNotice, setPatientSwitchedNotice] = useState(false);

  // Set or switch active patient context
  const setActivePatientContext = (patient: Patient | null, encounterId?: string | null) => {
    if (activePatient && patient && activePatient.id !== patient.id) {
      // Patient context changed: Clear previous conversation to prevent context leakage
      setMessages([]);
      setPatientSwitchedNotice(true);
    }
    setActivePatient(patient);
    if (encounterId) {
      setActiveEncounterId(encounterId);
    } else if (patient) {
      setActiveEncounterId(`ENC-${patient.id}`);
    } else {
      setActiveEncounterId(null);
    }
  };

  const openCopilot = (contextType?: string, defaultPrompt?: string) => {
    setIsOpen(true);
    if (contextType) {
      setActiveContextType(contextType);
    }
    if (defaultPrompt) {
      sendMessage(defaultPrompt);
    }
  };

  const closeCopilot = () => setIsOpen(false);
  const toggleCopilot = () => setIsOpen(prev => !prev);
  const dismissSwitchNotice = () => setPatientSwitchedNotice(false);

  const clearSession = () => {
    setMessages([]);
    setPatientSwitchedNotice(false);
  };

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMsg: CopilotMessage = {
      id: `msg_${Date.now()}_u`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const historyPayload = messages.map(m => ({
        role: m.role,
        content: m.content
      }));

      const res = await apiClient.post('/copilot/chat', {
        patient_id: activePatient ? activePatient.id : null,
        encounter_id: activeEncounterId,
        context_type: activeContextType,
        message: text,
        history: historyPayload
      });

      const data = res.data.data;
      const assistantMsg: CopilotMessage = {
        id: `msg_${Date.now()}_a`,
        role: 'assistant',
        content: data.reply,
        citations: data.citations || [],
        suggested_actions: data.suggested_actions || [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: CopilotMessage = {
        id: `msg_${Date.now()}_err`,
        role: 'assistant',
        content: `**Clinical Context Notice:** Unable to reach AI Copilot service. ${err?.response?.data?.error?.message || err?.message || 'Please check connection.'}`,
        citations: ['System Error Log'],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <CopilotContext.Provider
      value={{
        isOpen,
        openCopilot,
        closeCopilot,
        toggleCopilot,
        activePatient,
        setActivePatientContext,
        activeEncounterId,
        activeContextType,
        setActiveContextType,
        messages,
        isLoading,
        sendMessage,
        clearSession,
        patientSwitchedNotice,
        dismissSwitchNotice
      }}
    >
      {children}
    </CopilotContext.Provider>
  );
};

export const useCopilot = () => {
  const context = useContext(CopilotContext);
  if (!context) {
    throw new Error('useCopilot must be used within a CopilotProvider');
  }
  return context;
};
