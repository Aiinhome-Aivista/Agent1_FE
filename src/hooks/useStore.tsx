import { useEffect, useReducer, useRef, createContext, useContext, type ReactNode } from 'react';
import type { AgentStatus, Incident, LogEntry, Pipeline } from '../types';
import { api, wsUrl, apiEvents } from '../services/api';

interface State {
  pipelines: Pipeline[];
  incidents: Incident[];
  agents: AgentStatus[];
  logs: LogEntry[];
  simulating: boolean;
  connected: boolean;
  isLoading: boolean;
  // Live highlighting — which agent is currently "thinking"
  activeAgentRoles: Record<string, number>; // role -> expiry epoch
}

type Action =
  | { type: 'snapshot'; payload: { pipelines: Pipeline[]; incidents: Incident[]; agents: AgentStatus[]; simulating: boolean } }
  | { type: 'pipelines'; payload: Pipeline[] }
  | { type: 'incident'; payload: Incident }
  | { type: 'log'; payload: LogEntry }
  | { type: 'agents'; payload: AgentStatus[] }
  | { type: 'agent_started'; payload: { role: string; name: string; last_action: string } }
  | { type: 'agent_completed'; payload: { role: string; name: string; last_action: string } }
  | { type: 'simulating'; payload: boolean }
  | { type: 'connected'; payload: boolean }
  | { type: 'loading'; payload: boolean };

const initial: State = {
  pipelines: [],
  incidents: [],
  agents: [],
  logs: [],
  simulating: false,
  connected: false,
  isLoading: false,
  activeAgentRoles: {},
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'snapshot':
      return {
        ...state,
        pipelines: action.payload.pipelines,
        incidents: action.payload.incidents,
        agents: action.payload.agents,
        simulating: action.payload.simulating,
      };
    case 'pipelines':
      return { ...state, pipelines: action.payload };
    case 'incident': {
      const incoming = action.payload;
      const idx = state.incidents.findIndex((i) => i.id === incoming.id);
      const incidents =
        idx >= 0
          ? state.incidents.map((i, k) => (k === idx ? incoming : i))
          : [incoming, ...state.incidents];
      return { ...state, incidents };
    }
    case 'log':
      return { ...state, logs: [action.payload, ...state.logs].slice(0, 300) };
    case 'agents':
      return { ...state, agents: action.payload };
    case 'agent_started': {
      const agents = state.agents.map((a) =>
        a.role === action.payload.role
          ? { ...a, status: 'thinking' as const, last_action: action.payload.last_action }
          : a,
      );
      return {
        ...state,
        agents,
        activeAgentRoles: {
          ...state.activeAgentRoles,
          [action.payload.role]: Date.now() + 6000,
        },
      };
    }
    case 'agent_completed': {
      const agents = state.agents.map((a) =>
        a.role === action.payload.role
          ? { ...a, status: 'idle' as const, tasks_completed: a.tasks_completed + 1 }
          : a,
      );
      const next = { ...state.activeAgentRoles };
      delete next[action.payload.role];
      return { ...state, agents, activeAgentRoles: next };
    }
    case 'simulating':
      return { ...state, simulating: action.payload };
    case 'connected':
      return { ...state, connected: action.payload };
    case 'loading':
      return { ...state, isLoading: action.payload };
  }
}

type Ctx = {
  state: State;
  triggerIncident: () => Promise<void>;
  toggleSimulation: () => Promise<void>;
  approveIncident: (id: string) => Promise<void>;
  rejectIncident: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
};

const StoreContext = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initial);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);

  // Bootstrap REST
  const bootstrap = async () => {
    // Fetch each independently to prevent one 404 from breaking the whole app
    api.pipelines()
      .then(pipelines => dispatch({ type: 'pipelines', payload: pipelines }))
      .catch(e => console.warn('Pipelines fetch failed', e));


    /* 
    api.agents()
      .then(agents => dispatch({ type: 'agents', payload: agents }))
      .catch(e => console.warn('Agents fetch failed', e)); 
    */
  };

  // WebSocket lifecycle
  useEffect(() => {
    let cancelled = false;

    const connect = () => {
      const url = wsUrl();
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        if (cancelled) {
          ws.close();
          return;
        }
        dispatch({ type: 'connected', payload: true });
      };
      ws.onclose = () => {
        if (cancelled) return;
        dispatch({ type: 'connected', payload: false });
        // Reconnect with backoff
        reconnectTimerRef.current = window.setTimeout(connect, 2000);
      };
      ws.onerror = () => {
        // Closing handler will fire next
      };
      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data);
          handleEvent(msg);
        } catch (e) {
          console.warn('Bad WS payload', e);
        }
      };
    };

    const handleEvent = (msg: { event: string; payload: any }) => {
      switch (msg.event) {
        case 'snapshot':
          dispatch({ type: 'snapshot', payload: msg.payload });
          break;
        case 'pipelines_update':
          dispatch({ type: 'pipelines', payload: msg.payload });
          break;
        case 'incident_update':
          dispatch({ type: 'incident', payload: msg.payload });
          break;
        case 'log':
          dispatch({ type: 'log', payload: msg.payload });
          break;
        case 'agent_started':
          dispatch({ type: 'agent_started', payload: msg.payload });
          break;
        case 'agent_completed':
          dispatch({ type: 'agent_completed', payload: msg.payload });
          break;
      }
    };

    // Listen to global API loading events
    apiEvents.onLoading((loading: boolean) => {
      dispatch({ type: 'loading', payload: loading });
    });

    bootstrap();
    connect();

    return () => {
      cancelled = true;
      if (reconnectTimerRef.current) window.clearTimeout(reconnectTimerRef.current);
      if (wsRef.current && wsRef.current.readyState === 1) {
        wsRef.current.close();
      }
    };
  }, []);

  // Keep agent statuses fresh (poll once every 30s as a safety net)
  useEffect(() => {
    /* 
    const t = window.setInterval(async () => {
      try {
        const agents = await api.agents();
        dispatch({ type: 'agents', payload: agents });
      } catch {
        // ignore 
      }
    }, 30000);
    return () => window.clearInterval(t);
    */
  }, []);

  const triggerIncident = async () => {
    try {
      await api.triggerIncident({});
    } catch (e) {
      console.warn('trigger failed', e);
    }
  };

  const toggleSimulation = async () => {
    // Simulator removed in production; this is a no-op kept for UI compatibility.
    console.info('simulator removed in production build');
  };

  const approveIncident = async (id: string) => {
    await api.approveIncident(id);
  };

  const rejectIncident = async (id: string) => {
    await api.rejectIncident(id);
  };

  const ctx: Ctx = {
    state,
    triggerIncident,
    toggleSimulation,
    approveIncident,
    rejectIncident,
    refresh: bootstrap,
  };

  return <StoreContext.Provider value={ctx}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
