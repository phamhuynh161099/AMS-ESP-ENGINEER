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

export type RepairRouter = 'A' | 'B';

/** Một mục lỗi lấy từ /issue-machine/router-a hoặc /issue-machine/router-b */
export interface FaultItem {
  id: number;
  router_type: RepairRouter;
  fault_group: string;
  fault_group_code: string | null;
  fault_l1: string;
  fault_l1_code: string;
}

/** Dạng lỗi đã chọn sẽ gửi lên server (trường arrIssue) */
export interface SelectedFault {
  fault_group: string;
  fault_group_code: string | null;
  fault_l1: string;
  fault_l1_code: string;
}

/**
 * Form hoàn thành sửa chữa — chỉ giữ trong PHIÊN TICKET (in-memory).
 * Ticket mới nhận việc sẽ được clear hoàn toàn.
 */
export interface RepairFormState {
  router: RepairRouter | null;
  machineCode: string; // Route A: mã scan từ PDA/camera • Route B: ''
  selectedFaults: SelectedFault[];
}
