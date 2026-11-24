import { ApiResponse, ApisauceInstance, create } from "apisauce"
import Config from "@/config"
import { remove, storage } from "@/utils/LocalStorage"
import { store } from "@/redux/Store"
import { setAllClients, setGymInfo } from "@/redux/state/GymStates"
import Toast from "react-native-toast-message"
import { ApiConfig, ApiResult, BackendResponse } from "@/utils/types"

export const DEFAULT_API_CONFIG: ApiConfig = {
  url: Config.API_URL,
  timeout: 15000,
}

export class Api {
  apisauce: ApisauceInstance
  config: ApiConfig

  constructor(config: ApiConfig = DEFAULT_API_CONFIG) {
    this.config = config
    this.apisauce = create({
      baseURL: this.config.url,
      timeout: this.config.timeout,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${storage.getString('authToken') ?? ''}`,
      },
    })
  }
  setAuthToken(token?: string) {
    if (token) {
      this.apisauce.setHeader('Authorization', `Bearer ${token}`)
    } else {
      this.apisauce.deleteHeader('Authorization')
    }
  }

  async apiRequest<T>(method: "get" | "post" | "put" | "patch" | "delete", url: string, body?: any, params?: any, retries = 0): Promise<ApiResult> {
    const baseURL = this.apisauce.axiosInstance.defaults.baseURL ?? ''
    // console.log(`\n🌐 [API] ${method.toUpperCase()} ${url}\n   Base URL : ${baseURL}\n   Full URL : ${baseURL}${url}${params ? `\n   Params   : ${JSON.stringify(params)}` : ''}\n`)
    const isBodyless = method === 'get' || method === 'delete'
    const response: ApiResponse<BackendResponse<T>> = isBodyless
      ? await this.apisauce[method](url, params ?? undefined)
      : await this.apisauce[method](url, body, { params });
    if (!response.ok) {//Network fail
      const isRetryable = response.problem === 'TIMEOUT_ERROR' || response.problem === 'CONNECTION_ERROR' || response.problem === 'NETWORK_ERROR';

      if (isRetryable && retries < 2) {
        // Wait 2 seconds before retrying
        await new Promise(resolve => setTimeout(resolve, 2000));
        return this.apiRequest(method, url, body, params, retries + 1);
      }
      const message = response?.data?.message ?? response?.data?.error ?? "Network error";
      const inactive = response.status === 401 && (response.data as any)?.code === 'inactive';
      const title = inactive
        ? 'Access turned off'
        : response.status == 401 ? 'Session Expired' : response.status === 403 ? 'No access' : 'Something went wrong';
      Toast.show({ type: 'error', text1: title, text2: message, visibilityTime: inactive ? 4000 : 2000 });
      if (response.status === 401) remove('authToken');
      return { kind: 'error', message, status: response.status };
    }
    return { kind: 'ok', data: response?.data?.data as T };
  };

  verifyOtp = async (firebaseIdToken: string) => {
    return await this.apiRequest('post', '/api/auth/verify-otp', { firebaseIdToken });
  };

  onboard = async (body: any) => {
    return await this.apiRequest('post', '/api/auth/onboard', body);
  };

  passwordLogin = async (phoneNumber: string, password: string) => {
    return await this.apiRequest('post', '/api/auth/login-password', { phoneNumber, password });
  };

  checkUser = async (phoneNumber: string) => {
    return await this.apiRequest('post', '/api/auth/check-user', { phoneNumber });
  };

  resetPassword = async (oldPassword: string, newPassword: string) => {
    return await this.apiRequest('post', '/api/auth/reset-password', { oldPassword, newPassword });
  };

  dashboardAPI = async () => {
    return this.apiRequest('get', '/api/dashboard/summary');
  }

  dashboardRevenue = async (from: string, to: string, page = 1) => {
    return this.apiRequest('get', '/api/dashboard/revenue', undefined, { from, to, page, limit: 50 });
  }

  dashboardActivities = async (params: { from: string; to: string; page?: number; limit?: number }) => {
    return this.apiRequest('get', '/api/dashboard/activities', undefined, params);
  }

  gymInfo = async () => {
    const response = await this.apiRequest('get', '/api/gym/info');
    if (response.kind === 'ok') {
      store.dispatch(setGymInfo({ gymInfo: response.data }));
    }
  };

  allClients = async () => {
    const response = await this.apiRequest('get', '/api/client/all');
    if (response.kind === 'ok') {
      store.dispatch(setAllClients({ allClients: response.data }));
    }
  };

  allMemberships = async () => {
    return await this.apiRequest('get', '/api/membership/all');
  };

  createClient = async (body: any) => {
    return await this.apiRequest('post', '/api/client/add', body);
  };

  updateClient = async (body: any) => {
    return await this.apiRequest('patch', '/api/client/update', body);
  };

  getClient = async (id: string) => {
    return await this.apiRequest('get', `/api/client/clientInfo?id=${id}`, null);
  };

  deleteClient = async (id: string) => {
    return await this.apiRequest('delete', `/api/client/delete?id=${id}`, null);
  };

  renewMembership = async (body: any) => {
    return await this.apiRequest('patch', '/api/client/renew', body);
  };

  collectPayment = async (body: any) => {
    return await this.apiRequest('post', '/api/client/collect-payment', body);
  };

  amendMembership = async (body: any) => {
    return await this.apiRequest('patch', '/api/client/membership/amend', body);
  };

  pauseMembership = async (body: any) => {
    return await this.apiRequest('post', '/api/client/membership/pause', body);
  };

  resumeMembership = async (body: any) => {
    return await this.apiRequest('post', '/api/client/membership/resume', body);
  };

  getClientActivity = async (id: string) => {
    return await this.apiRequest('get', `/api/client/activity?id=${id}`, null);
  };

  savePushToken = async (expoPushToken: string) => {
    return await this.apiRequest('post', '/api/user/push-token', { expoPushToken });
  };

  updatePushPrefs = async (body: any) => {
    return await this.apiRequest('patch', '/api/user/push-prefs', body);
  };

  getPushPrefs = async () => {
    return await this.apiRequest('get', '/api/user/push-prefs');
  };

  updateReceiptSettings = async (body: any) => {
    return await this.apiRequest('post', '/api/settings/receipt', body);
  };

  createMembership = async (body: any) => {
    return await this.apiRequest('post', '/api/membership/add', body);
  };

  updateMembership = async (body: any) => {
    return await this.apiRequest('patch', '/api/membership/update', body);
  };

  deleteMembership = async (id: string) => {
    return await this.apiRequest('delete', `/api/membership/delete?id=${id}`, null);
  };

  updateGym = async (body: any) => {
    return await this.apiRequest('patch', '/api/gym/update', body);
  };

  getSettings = async () => {
    return await this.apiRequest('get', '/api/settings/');
  };

  updateSettings = async (body: any) => {
    return await this.apiRequest('post', '/api/settings/', body);
  };

  getWhatsappSummary = async () => {
    return await this.apiRequest('get', '/api/whatsapp/summary');
  };

  getWhatsappLogs = async (params?: { page?: number; limit?: number; status?: string; template?: string; search?: string }) => {
    const clean = Object.fromEntries(
      Object.entries(params || {}).filter(([, v]) => v !== undefined && v !== '')
    )
    return await this.apiRequest('get', '/api/whatsapp/logs', undefined, clean);
  };

  uploadClientProfilePicture = async (clientId: string, imageUri: string) => {
    const formData = new FormData();
    const filename = imageUri.split('/').pop() || 'photo.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    formData.append('file', {
      uri: imageUri,
      name: filename,
      type,
    } as any);

    const response: any = await this.apisauce.post(
      `/api/upload/client-profile?clientId=${clientId}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    if (!response.ok) {
      const message = response?.data?.message ?? "Upload failed";
      Toast.show({ type: 'error', text1: 'Upload Error', text2: message });
      return { kind: 'error', message };
    }
    return { kind: 'ok', data: response?.data?.data };
  };

  uploadGymLogo = async (imageUri: string) => {
    const formData = new FormData();
    const filename = imageUri.split('/').pop() || 'logo.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    formData.append('file', {
      uri: imageUri,
      name: filename,
      type,
    } as any);

    const response: any = await this.apisauce.post(
      '/api/upload/gym-logo',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    if (!response.ok) {
      const message = response?.data?.message ?? "Upload failed";
      Toast.show({ type: 'error', text1: 'Upload Error', text2: message });
      return { kind: 'error', message };
    }
    return { kind: 'ok', data: response?.data?.data };
  };

  uploadReceiptAsset = async (imageUri: string, type: 'signature' | 'logo' = 'signature') => {
    const formData = new FormData();
    const isPngDataUri = imageUri.startsWith('data:image/png');
    const filename = isPngDataUri ? `${type}.png` : imageUri.split('/').pop() || `${type}.jpg`;
    const match = /\.(\w+)$/.exec(filename);
    const mimeType = isPngDataUri ? 'image/png' : match ? `image/${match[1]}` : 'image/jpeg';

    formData.append('file', {
      uri: imageUri,
      name: filename,
      type: mimeType,
    } as any);

    const response: any = await this.apisauce.post(
      `/api/upload/receipt-asset?type=${type}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    if (!response.ok) {
      const message = response?.data?.message ?? "Upload failed";
      Toast.show({ type: 'error', text1: 'Upload Error', text2: message });
      return { kind: 'error', message };
    }
    return { kind: 'ok', data: response?.data?.data };
  };

  uploadWhatsappHeaderImage = async (imageUri: string) => {
    const formData = new FormData();
    const filename = imageUri.split('/').pop() || 'header.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    formData.append('file', {
      uri: imageUri,
      name: filename,
      type,
    } as any);

    const response: any = await this.apisauce.post(
      '/api/upload/whatsapp-header',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    if (!response.ok) {
      const message = response?.data?.message ?? "Upload failed";
      Toast.show({ type: 'error', text1: 'Upload Error', text2: message });
      return { kind: 'error', message };
    }
    return { kind: 'ok', data: response?.data?.data };
  };

  seedDemoData = async (action: 'seed' | 'clear') => {
    return this.apiRequest('post', '/api/gym/seed-demo-data', { action });
  };

  listStaff = async () => {
    return this.apiRequest('get', '/api/staff');
  };

  createStaff = async (body: any) => {
    return this.apiRequest('post', '/api/staff', body);
  };

  updateStaff = async (id: string, body: any) => {
    return this.apiRequest('patch', `/api/staff/${id}`, body);
  };

  staffAttendance = async (id: string, date: string) => {
    return this.apiRequest('get', `/api/staff/${id}/attendance`, undefined, { date });
  };

  addStaffPunch = async (id: string, note?: string) => {
    return this.apiRequest('post', `/api/staff/${id}/punches`, note ? { note } : {});
  };

  voidStaffPunch = async (punchId: string) => {
    return this.apiRequest('post', `/api/staff/punches/${punchId}/void`);
  };

  biometricDevice = async () => this.apiRequest('get', '/api/biometric/device');
  biometricEnabled = async (enabled: boolean) => this.apiRequest('post', '/api/biometric/enabled', { enabled });
  pairReader = async (serialNumber: string) => this.apiRequest('post', '/api/biometric/device/pair', { serialNumber });
  unpairReader = async () => this.apiRequest('post', '/api/biometric/device/unpair', {});
  openDoor = async () => this.apiRequest('post', '/api/biometric/device/open', {});
  doorCommand = async (commandId: number) => this.apiRequest('get', `/api/biometric/device/commands/${commandId}`);
  checkins = async (date: string) => this.apiRequest('get', '/api/biometric/checkins', undefined, { date });
  memberFingerprint = async (id: string) => this.apiRequest('get', `/api/biometric/members/${id}`);
  startMemberFingerprint = async (id: string) => this.apiRequest('post', `/api/biometric/members/${id}/fingerprint`, {});
  confirmMemberFingerprint = async (id: string) => this.apiRequest('post', `/api/biometric/members/${id}/fingerprint/confirm`, {});
  cancelMemberFingerprint = async (id: string) => this.apiRequest('post', `/api/biometric/members/${id}/fingerprint/cancel`, {});
  staffFingerprint = async (id: string) => this.apiRequest('get', `/api/biometric/staff/${id}`);
  startStaffFingerprint = async (id: string) => this.apiRequest('post', `/api/biometric/staff/${id}/fingerprint`, {});
  confirmStaffFingerprint = async (id: string) => this.apiRequest('post', `/api/biometric/staff/${id}/fingerprint/confirm`, {});
  cancelStaffFingerprint = async (id: string) => this.apiRequest('post', `/api/biometric/staff/${id}/fingerprint/cancel`, {});

  getStaff = async (id: string) => this.apiRequest('get', `/api/staff/${id}`);
  staffInvite = async (id: string) => this.apiRequest('get', `/api/staff/${id}/invite`);
  staffMonth = async (id: string, month: string) => this.apiRequest('get', `/api/staff/${id}/attendance`, undefined, { month });
  staffBoard = async (date?: string) => this.apiRequest('get', '/api/staff/attendance/today', undefined, date ? { date } : undefined);

  getMe = async () => this.apiRequest('get', '/api/auth/me');
  updateMe = async (body: { name?: string; photo?: string | null }) => this.apiRequest('patch', '/api/auth/me', body);
  uploadUserPhoto = async (imageUri: string) => {
    const formData = new FormData();
    const filename = imageUri.split('/').pop() || 'photo.jpg';
    const match = /\.(\w+)$/.exec(filename);
    formData.append('file', { uri: imageUri, name: filename, type: match ? `image/${match[1]}` : 'image/jpeg' } as any);
    const response: any = await this.apisauce.post('/api/upload/user-photo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    if (!response.ok) {
      const message = response?.data?.message ?? "Upload failed";
      Toast.show({ type: 'error', text1: 'Upload Error', text2: message });
      return { kind: 'error', message };
    }
    return { kind: 'ok', data: response?.data?.data };
  };

  listRoles = async () => this.apiRequest('get', '/api/roles');
  createRole = async (body: { name: string; permissions: string[] }) => this.apiRequest('post', '/api/roles', body);
  updateRole = async (id: string, body: { name?: string; permissions?: string[] }) => this.apiRequest('patch', `/api/roles/${id}`, body);
  deleteRole = async (id: string) => this.apiRequest('delete', `/api/roles/${id}`);

  upgradeOptions = async (clientId: string) => this.apiRequest('get', '/api/client/upgrade/options', undefined, { clientId });
  upgradeMembership = async (body: any) => this.apiRequest('post', '/api/client/upgrade', body);
  chatUnread = async () => this.apiRequest('get', '/api/chat/unread');
  chatThreads = async (search?: string) => this.apiRequest('get', '/api/chat/threads', undefined, search ? { search } : undefined);
  chatThread = async (target: { memberId?: string | null; phone?: string }) =>
    this.apiRequest('get', '/api/chat/thread', undefined, target.memberId ? { memberId: target.memberId } : { phone: target.phone });
  chatSend = async (body: { memberId?: string | null; phone?: string; text: string }) => this.apiRequest('post', '/api/chat/send', body);
  chatSendTemplate = async (body: { memberId: string; template: string }) => this.apiRequest('post', '/api/chat/send-template', body);
  memberVisits = async (id: string, month: string) => this.apiRequest('get', `/api/biometric/members/${id}/visits`, undefined, { month });

  report = async (kind: string, from: string, to: string) => this.apiRequest('get', `/api/reports/${kind}`, undefined, { from, to });

}

// Singleton instance of the API for convenience
export const api = new Api()
