export type DeviceState = 'IDLE' | 'REQUEST_RECEIVED' | 'ACKNOWLEDGED';

export type ConnectionStatus =
  | 'CONNECTED'
  | 'RECONNECTING'
  | 'DISCONNECTED'
  | 'UNREGISTERED'
  | 'SERVER_ERROR';

export interface EngineerInfo {
  id: string; // eng_id
  espId: string; // engineer_esp_id
  espMac: string; // engineer_esp_mac
  name: string; // eng_name
  lineAssignmentId?: string | null; // id from lineInfo
  lineName?: string | null;
  isAssigned: boolean;
  isRegistered: boolean;
  rawLineInfo?: Record<string, unknown>;
}

export interface TicketInfo {
  id: string;
  machineCode: string; // line_id
  machineName: string; // line_esp_name
  location: string;
  description: string; // issueDescription
  status: 'NONE' | 'REQUESTED' | 'ACKNOWLEDGED' | string;
  receivedAt?: number;
  acknowledgedAt?: number;
}

export interface ServerConfig {
  serverBaseUrl: string;
  engineerId: string; // ID kỹ sư (e.g. "12")
  macAddress: string;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  pollIntervalRequests: number; // ms, default 3000
  pollIntervalInfo: number; // ms, default 30000
  simulationMode: boolean;
}

export interface ActivityLog {
  id: string;
  timestamp: number;
  type: 'INFO' | 'REQUEST' | 'ACK' | 'SUCCESS' | 'ERROR' | 'NETWORK';
  message: string;
  details?: string;
}

export interface TransitionScreenState {
  isActive: boolean;
  title: string;
  line1: string;
  line2: string;
  expiresAt: number;
}
