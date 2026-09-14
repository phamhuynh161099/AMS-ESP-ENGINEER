import { EngineerInfo, TicketInfo } from '@/types/engineer';
import { Platform } from 'react-native';

interface ApiResponse<T> {
  success: boolean;
  httpCode?: number;
  data?: T;
  error?: string;
}

/**
 * Resolve endpoint URL.
 * On Web: If pointing to 10.101.1.193:8080, route through the Metro proxy /espRecieve to bypass CORS
 * On Native (Android / iOS): Use direct full URL
 */
function resolveUrl(baseUrl: string, endpointPath: string): string {
  const cleanBase = baseUrl.replace(/\/$/, '');
  const cleanEndpoint = endpointPath.startsWith('/') ? endpointPath : `/${endpointPath}`;

  if (Platform.OS === 'web') {
    // If running in browser and baseUrl points to the factory IP, use proxy path
    if (cleanBase.includes('10.101.1.193:8080/espRecieve') || cleanBase.endsWith('/espRecieve')) {
      return `/espRecieve${cleanEndpoint}`;
    }
  }

  return `${cleanBase}${cleanEndpoint}`;
}

/**
 * Helper to fetch with timeout
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 5000
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (err: any) {
    clearTimeout(id);
    if (err.name === 'AbortError') {
      throw new Error(`Quá thời gian kết nối (${timeoutMs / 1000}s) tới ${url}`);
    }
    throw err;
  }
}

/**
 * GET /get-engineer-info-by?mac={macAddress}
 * Polled every 30 seconds when in IDLE
 */
export async function getEngineerInfoByMac(
  baseUrl: string,
  macAddress: string
): Promise<ApiResponse<EngineerInfo>> {
  const url = resolveUrl(baseUrl, `/get-engineer-info-by?mac=${encodeURIComponent(macAddress)}`);
  try {
    console.log('[API] Fetching engineer info:', url);
    const res = await fetchWithTimeout(
      url,
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
      },
      6000
    );

    const httpCode = res.status;
    if (!res.ok) {
      return {
        success: false,
        httpCode,
        error: `Lỗi máy chủ HTTP: ${httpCode}`,
      };
    }

    const json = await res.json();
    const lineInfo = json?.etc?.lineInfo;

    if (!lineInfo) {
      return {
        success: false,
        httpCode,
        error: 'Không tìm thấy thông tin cho địa chỉ MAC này',
      };
    }

    const assignmentId = lineInfo.id;
    const isAssigned =
      assignmentId !== null &&
      assignmentId !== undefined &&
      String(assignmentId).trim() !== '' &&
      String(assignmentId) !== 'null';

    const info: EngineerInfo = {
      id: String(lineInfo.eng_id ?? lineInfo.engineer_esp_id ?? ''),
      espId: String(lineInfo.engineer_esp_id ?? ''),
      espMac: String(lineInfo.engineer_esp_mac ?? macAddress),
      name: String(lineInfo.eng_name ?? lineInfo.engineer_esp_name ?? 'Kỹ sư'),
      lineAssignmentId: isAssigned ? String(assignmentId) : null,
      lineName: lineInfo.line_name || lineInfo.line_esp_name ? String(lineInfo.line_name || lineInfo.line_esp_name) : null,
      isAssigned,
      isRegistered: true,
      rawLineInfo: lineInfo,
    };

    console.log('[API] Engineer info resolved:', info);
    return {
      success: true,
      httpCode,
      data: info,
    };
  } catch (err: any) {
    console.warn('[API Error getEngineerInfoByMac]:', err?.message);
    return {
      success: false,
      error: err?.message || 'Không thể kết nối máy chủ',
    };
  }
}

/**
 * GET /checkPendingRequest/{eng_id}
 * Polled every 3 seconds continuously
 */
export async function checkPendingRequests(
  baseUrl: string,
  engId: string
): Promise<
  ApiResponse<{
    hasRequest: boolean;
    ticket: TicketInfo | null;
  }>
> {
  const cleanId = String(engId || '').trim();
  if (!cleanId) {
    return {
      success: false,
      error: 'Chưa có ID kỹ sư để kiểm tra sự cố',
    };
  }

  const url = resolveUrl(baseUrl, `/checkPendingRequest/${encodeURIComponent(cleanId)}`);
  try {
    const res = await fetchWithTimeout(
      url,
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
      },
      5000
    );

    const httpCode = res.status;
    if (!res.ok) {
      return {
        success: false,
        httpCode,
        error: `Máy chủ phản hồi HTTP: ${httpCode}`,
      };
    }

    const json = await res.json();
    const etc = json?.etc;

    if (!etc) {
      return {
        success: true,
        httpCode,
        data: { hasRequest: false, ticket: null },
      };
    }

    const hasRequest = Boolean(etc.hasRequest);
    const data = etc.data;

    if (hasRequest && data) {
      const ticket: TicketInfo = {
        id: String(data.id ?? ''),
        machineCode: String(data.line_id ?? data.line_code ?? ''),
        machineName: String(data.line_esp_name ?? data.line_name ?? 'Chuyền không tên'),
        location: String(data.location ?? 'Chưa có vị trí'),
        description: String(
          data.issueDescription ??
          data.description ??
          data.issue ??
          'Yêu cầu hỗ trợ kỹ thuật tại chuyền'
        ),
        status: String(data.status ?? 'REQUESTED'),
      };

      return {
        success: true,
        httpCode,
        data: { hasRequest: true, ticket },
      };
    }

    return {
      success: true,
      httpCode,
      data: { hasRequest: false, ticket: null },
    };
  } catch (err: any) {
    console.warn('[API Error checkPendingRequests]:', err?.message);
    return {
      success: false,
      error: err?.message || 'Lỗi mạng khi kiểm tra sự cố',
    };
  }
}

/**
 * POST /acknowledge
 * Engineer acknowledges ticket
 * Timeout is 15000ms
 */
export async function acknowledgeTicket(
  baseUrl: string,
  requestId: string,
  macAddress: string
): Promise<ApiResponse<boolean>> {
  const url = resolveUrl(baseUrl, '/acknowledge');
  const payload = {
    currentRequestId: requestId,
    macAddress: macAddress,
  };

  try {
    console.log('[API] Sending acknowledge to:', url, payload);
    const res = await fetchWithTimeout(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      },
      15000
    );

    const httpCode = res.status;
    if (!res.ok) {
      return {
        success: false,
        httpCode,
        error: `Lỗi máy chủ (${httpCode}) khi xác nhận nhận việc`,
      };
    }

    const json = await res.json();
    const isSuccess = Boolean(json?.etc?.isSuccess ?? json?.isSuccess);

    return {
      success: isSuccess,
      httpCode,
      data: isSuccess,
      error: isSuccess ? undefined : 'Máy chủ từ chối xác nhận ticket này',
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Mất kết nối mạng khi gửi xác nhận',
    };
  }
}
