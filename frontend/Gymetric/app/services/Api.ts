import { ApiResponse, ApisauceInstance, create } from "apisauce"
import Config from "@/config"
import { remove, storage } from "@/utils/LocalStorage"
import { store } from "@/redux/Store"
import { setAllClients, setGymInfo } from "@/redux/state/GymStates"
import Toast from "react-native-toast-message"
import { ApiConfig, ApiResult, BackendResponse } from "@/utils/types"

export const DEFAULT_API_CONFIG: ApiConfig = {
  url: Config.API_URL,
  timeout: 10000,
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

  async apiRequest<T>(method: "get" | "post" | "put" | "patch" | "delete", url: string, body?: any, params?: any): Promise<ApiResult> {
    const response: ApiResponse<BackendResponse<T>> = await this.apisauce[method](url, body, { params });
    if (!response.ok) {//Network fail
      const message = response?.data?.message ?? "Network error";
      Toast.show({ type: 'error', text1: response.status == 401 ? 'Session Expired' : 'Internal error', text2: message, visibilityTime: 2000 });
      if (response.status === 401) remove('authToken');
      return { kind: 'error', message };
    }
    return { kind: 'ok', data: response?.data?.data as T };
  };

  async loginAPI(username: string, password: string) {
    return this.apiRequest('post', '/api/auth/login', { username, password });
  }

  dashboardAPI = async () => {
    return this.apiRequest('get', '/api/dashboard/summary');
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

  renewMembership = async (body: any) => {
    return await this.apiRequest('patch', '/api/client/renew', body);
  };

  createMembership = async (body: any) => {
    return await this.apiRequest('post', '/api/membership/add', body);
  };

  updateMembership = async (body: any) => {
    return await this.apiRequest('patch', '/api/membership/update', body);
  };

  updateGym = async (body: any) => {
    return await this.apiRequest('patch', '/api/gym/update', body);
  };

}

// Singleton instance of the API for convenience
export const api = new Api()
