/**
 * This Api class lets you define an API endpoint and methods to request
 * data and process it.
 *
 * See the [Backend API Integration](https://docs.infinite.red/ignite-cli/boilerplate/app/services/#backend-api-integration)
 * documentation for more details.
 */
import { ApiResponse, ApisauceInstance, create } from "apisauce"

import Config from "@/config"
import type { ApiResult, BackendResponse, EpisodeItem } from "@/services/api/types"

import { GeneralApiProblem, getGeneralApiProblem } from "./apiProblem"
import type { ApiConfig, ApiFeedResponse } from "./types"
import { storage } from "@/utils/storage"
import { store } from "@/redux/Store"
import { setGymInfo } from "@/redux/state/GymStates"

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

  async apiRequest<T>(method: "get" | "post" | "put" | "patch" | "delete", url: string, body?: any, params?: any): Promise<ApiResult> {
    const response: ApiResponse<BackendResponse<T>> = await this.apisauce[method](url, body, { params });
    if (!response.ok) {//Network fail
      const message = response?.data?.message ?? "Network error"
      return {kind: 'error', message};
    }
    if (!response.data?.success) {//backend fail
      return {kind: 'error', message: response?.data?.message ?? "Network error"};
    }
    return {kind: 'ok', data: response?.data?.data as T};
  };

  async getEpisodes(): Promise<{ kind: "ok"; episodes: EpisodeItem[] } | GeneralApiProblem> {
    // make the api call
    const response: ApiResponse<ApiFeedResponse> = await this.apisauce.get(
      `api.json?rss_url=https%3A%2F%2Ffeeds.simplecast.com%2FhEI_f9Dx`,
    )

    // the typical ways to die when calling an api
    if (!response.ok) {
      const problem = getGeneralApiProblem(response)
      if (problem) return problem
    }

    // transform the data into the format we are expecting
    try {
      const rawData = response.data

      // This is where we transform the data into the shape we expect for our model.
      const episodes: EpisodeItem[] =
        rawData?.items.map((raw) => ({
          ...raw,
        })) ?? []

      return { kind: "ok", episodes }
    } catch (e) {
      if (__DEV__ && e instanceof Error) {
        console.error(`Bad data: ${e.message}\n${response.data}`, e.stack)
      }
      return { kind: "bad-data" }
    }
  }

  async loginAPI(username: string, password: string) {
    return this.apiRequest('post', '/api/auth/login', {username, password});
  }

  dashboardAPI = async() => {
    return this.apiRequest('get', '/api/dashboard/summary');
  }

  gymInfo = async() => {
    const response = await this.apiRequest('get', '/api/gym/info');
    if(response.kind === 'ok'){
      store.dispatch(setGymInfo({gymInfo: response.data}));
    }
  };

  allClients = async() => {
      return await this.apiRequest('get', '/api/client/all');
  };

}

// Singleton instance of the API for convenience
export const api = new Api()
