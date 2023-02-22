import { Configuration } from './configuration';
import ARLO_URLS from './constants/arlo-urls';
import AUTH_URLS_MFA from './constants/auth-urls-mfa';

import { CookieJar } from 'tough-cookie';
import { wrapper } from 'axios-cookiejar-support';
import axios, { AxiosInstance } from 'axios';

type Verb = 'POST' | 'GET' | 'PUT';

type FactorType = 'EMAIL' | 'SMS';
type FactorRole = 'SECONDARY' | 'PRIMARY';

interface HttpRequest {
  verb: Verb;
  url: string;
  body?: Record<string, any>;
  headers: object;
}

interface ArloAuthResponse {
  token: string;
  userId: string;
  authenticated: number;
  issued: number;
  expiresIn: number;
  mfa: boolean;
  authCompleted: boolean;
  type: string;
  MFA_State: string;
}

export interface AuthResponse {
  authToken: string;
  /**
   * Unix timestamp representing the date the token was issued.
   */
  authenticated: number;
  userID: string;
}

export interface MfaFactorResponse {
  items: Array<MfaFactor>;
}

export interface MfaFactor {
  factorId: string;
  factorType: FactorType;
  displayName: string;
  factorNickname: string;
  applicationId: string;
  applicationName: string;
  factorRole: FactorRole;
}

export class ArloAuthenticator {
  private config: Configuration;
  private readonly axiosClient: AxiosInstance;

  constructor(configuration: Configuration) {
    this.config = this.validateConfiguration(configuration);

    const buffer = Buffer.from(this.config.arloPassword);
    this.config.arloPassword = buffer.toString('base64');

    const jar = new CookieJar();
    this.axiosClient = wrapper(axios.create({ jar }));
  }

  /**
   * Validates the configuration throwing an exception if anything is incorrect.
   * @param configuration Returns an unmodified valid configuration.
   */
  private validateConfiguration(configuration: Configuration): Configuration {
    // TODO: Validate configuration.
    return configuration;
  }

  async login() {
    const headers = this.headers();
  }

  async getAuthToken(): Promise<AuthResponse> {
    const request: HttpRequest = {
      verb: 'POST',
      url: AUTH_URLS_MFA.GET_AUTH_TOKEN,
      body: {
        email: this.config.arloUser,
        password: this.config.arloPassword,
        language: 'en',
        EnvSource: 'prod',
      },
      headers: this.headers(),
    };

    const response = await this.httpRequest<ArloAuthResponse>(request);

    const buff = Buffer.from(response.token);
    const tokenBase64 = buff.toString('base64');

    return {
      authToken: tokenBase64,
      authenticated: response.authenticated,
      userID: response.userId,
    };
  }

  async getFactors(token: string): Promise<Array<MfaFactor>> {
    const request: HttpRequest = {
      verb: 'GET',
      url: `${AUTH_URLS_MFA.GET_FACTORS}${token}`,
      headers: Object.assign(this.headers(), { authorization: token }),
    };

    const response = await this.httpRequest<MfaFactorResponse>(request);
    return response.items;
  }

  async verifyAuthToken(token: string) {
    const request: HttpRequest = {
      verb: 'GET',
      url: `${AUTH_URLS_MFA.VERIFY_AUTH}${token}`,
      headers: Object.assign(this.headers(), { authorization: token }),
    };

    return await this.httpRequest(request);
  }

  private async httpRequest<T>(request: HttpRequest): Promise<T> {
    const options = {
      withCredentials: true,
      method: request.verb,
      headers: request.headers,
      url: request.url,
      data: request.body,
    };

    const response = (await this.axiosClient(options)).data;

    if (response.meta.code !== 200) {
      throw new Error(`Error code received ${response.meta.code}`);
    }

    return response.data;
  }

  private headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      Connection: 'keep-alive',
      Accept: '*/*',
      'Accept-Language': 'en-gb',
      'Accept-Encoding': 'gzip, deflate, br',
      Pragma: 'no-cache',
      'X-DreamFactory-Api-Key':
        '8c6b41f20897aa6b3f852a1ca3aded0471888e2e119da2737de2a9c797a8ae8d',
      'User-Agent':
        'Mozilla/5.0 (iPhone; CPU iPhone OS 11_1_2 like Mac OS X) AppleWebKit/604.3.5 (KHTML, like Gecko) Mobile/15B202 NETGEAR/v1 (iOS Vuezone)',
      DNT: '1',
      schemaVersion: '1',
      'Auth-Version': '2',
      origin: `https://${ARLO_URLS.BASE_URL}`,
      referer: `https://${ARLO_URLS.BASE_URL}/`,
      source: 'arloCamWeb',
    };
  }
}
