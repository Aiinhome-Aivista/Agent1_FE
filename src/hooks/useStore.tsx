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
  | { type: 'incidents'; payload: Incident[] }
  | { type: 'incident'; payload: Incident }
  | { type: 'logs'; payload: LogEntry[] }
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
        pipelines: action.payload.pipelines && action.payload.pipelines.length > 0 ? action.payload.pipelines : state.pipelines,
        incidents: action.payload.incidents,
        agents: action.payload.agents,
        simulating: action.payload.simulating,
      };
    case 'pipelines':
      return { ...state, pipelines: action.payload };
    case 'incidents':
      return { ...state, incidents: action.payload };
    case 'incident': {
      const incoming = action.payload;
      const idx = state.incidents.findIndex((i) => i.id === incoming.id);
      const incidents =
        idx >= 0
          ? state.incidents.map((i, k) => (k === idx ? incoming : i))
          : [incoming, ...state.incidents];
      return { ...state, incidents };
    }
    case 'logs': {
      const seen = new Set(state.logs.map((l) => l.id));
      const incoming = action.payload.filter((l) => !seen.has(l.id));
      return { ...state, logs: [...state.logs, ...incoming].slice(0, 300) };
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
  const bootstrap = async (silent = false) => {
    // Fetch each independently to prevent one 404 from breaking the whole app
    api.pipelines(undefined, { silent })
      .then(pipelines => dispatch({ type: 'pipelines', payload: pipelines }))
      .catch(e => console.warn('Pipelines fetch failed', e));

    api.incidents('all', { silent })
      .then(incidents => dispatch({ type: 'incidents', payload: incidents }))
      .catch(e => console.warn('Incidents fetch failed', e));

    api.audit(50, { silent })
      .then(auditLogs => {
        const normalized: LogEntry[] = (auditLogs || []).map((l: any) => ({
          id: String(l.id),
          time: l.ts || l.time || new Date().toISOString(),
          msg: l.msg || "",
          type: (l.type || "info").toLowerCase() as any,
          agent_role: l.agent_role,
          incident_id: l.incident_id,
        }));
        dispatch({ type: 'logs', payload: normalized });
      })
      .catch(e => console.warn('Audit logs fetch failed', e));
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

    const handleEvent = (msg: { event: string; payload?: any; data?: any }) => {
      const payload = msg.payload ?? msg.data;
      switch (msg.event) {
        case 'snapshot':
          dispatch({ type: 'snapshot', payload });
          break;
        case 'pipelines_update':
        case 'pipeline.status_updated':
        case 'pipeline.created':
        case 'pipeline.updated':
          if (Array.isArray(payload)) {
            dispatch({ type: 'pipelines', payload });
          } else {
            api.pipelines(undefined, { silent: true }).then(p => dispatch({ type: 'pipelines', payload: p })).catch(() => {});
          }
          break;
        case 'incident':
        case 'incident_update':
        case 'incident.created':
        case 'incident.updated':
          if (payload && typeof payload === 'object' && 'id' in payload) {
            dispatch({ type: 'incident', payload });
          } else {
            api.incidents('all', { silent: true }).then(incs => dispatch({ type: 'incidents', payload: incs })).catch(() => {});
          }
          break;
        case 'log':
        case 'logs.updated':
          if (payload && typeof payload === 'object') dispatch({ type: 'log', payload });
          break;
        case 'agent_started':
          if (payload) dispatch({ type: 'agent_started', payload });
          break;
        case 'agent_completed':
          if (payload) dispatch({ type: 'agent_completed', payload });
          break;
      }
    };

    // Listen to global API loading events
    apiEvents.onLoading((loading: boolean) => {
      dispatch({ type: 'loading', payload: loading });
    });

    bootstrap(false);
    connect();

    return () => {
      cancelled = true;
      if (reconnectTimerRef.current) window.clearTimeout(reconnectTimerRef.current);
      if (wsRef.current && wsRef.current.readyState === 1) {
        wsRef.current.close();
      }
    };
  }, []);

  // Smart background sync:
  // - Polls every 20s as a safety fallback when the tab is visible (silent = true)
  // - Pauses when the browser tab is hidden to save battery & network bandwidth
  // - Instantly refetches silently when the user switches back to the tab
  // - Live updates arrive instantly via WebSocket
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        bootstrap(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    const t = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        bootstrap(true);
      }
    }, 20000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.clearInterval(t);
    };
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
