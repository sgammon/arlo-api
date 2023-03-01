import axios, { AxiosInstance } from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import * as imaps from 'imap-simple';
import { ImapSimpleOptions } from 'imap-simple';
import { simpleParser } from 'mailparser';
import parse from 'node-html-parser';
import { CookieJar } from 'tough-cookie';
import ARLO_URLS from './constants/arlo-urls';
import AUTH_URLS_MFA from './constants/auth-urls-mfa';
import {
  ArloAuthResponse,
  ArloResponse,
  AuthResponse,
  HttpRequest,
  LoginResult,
  MfaAuth,
  MfaAuthResponse,
  MfaFactor,
  MfaFactorResponse,
  MfaRequestResponse,
  SessionResponse,
  VerifyResponse,
} from './interfaces/arlo-auth-interfaces';
import { DEVICE_RESPONSE, HEADERS_TYPE } from './interfaces/arlo-interfaces';
import { Configuration } from './interfaces/configuration';
import { assert, assertDefined, stringsEqualInsensitive } from './utils/utils';

export class Client {
  private config: Configuration;
  public readonly axiosClient: AxiosInstance;
  public loginResult?: LoginResult;
  public cookieJar: CookieJar;

  constructor(configuration: Configuration) {
    this.config = this.validateConfiguration(configuration);

    const buffer = Buffer.from(this.config.arloPassword);
    this.config.arloPassword = buffer.toString('base64');

    this.cookieJar = new CookieJar();
    this.axiosClient = wrapper(axios.create({ jar: this.cookieJar }));
  }

  public authenticatedHeaders(): HEADERS_TYPE {
    return Object.assign(this.headers(), {
      Authorization: this.loginResult?.token,
    });
  }

  /**
   * Validates the configuration throwing an exception if anything is incorrect.
   * @param configuration Returns an unmodified valid configuration.
   */
  private validateConfiguration(configuration: Configuration): Configuration {
    assertDefined(configuration.arloUser, 'arloUser');
    assertDefined(configuration.arloPassword, 'arloPassword');
    assertDefined(configuration.emailUser, 'emailUser');
    assertDefined(configuration.emailPassword, 'emailPassword');
    assertDefined(configuration.emailServer, 'emailServer');
    assertDefined(configuration.emailImapPort, 'emailImapPort');

    return configuration;
  }

  /**
   * Login operations order...
   *
   * - Gets authentication token using Arlo credentials
   * - Finds the MFA factor matching the configuration's email username
   * - Requests MFA OTP code to be sent to the email username
   * - Logins to the email server via IMAP and retrieves OTP code
   * - Submits the MFA code and verifies the MFA flow is complete
   * - Finally creates a new session.
   *
   * Returns the necessary information to make further requests.
   */
  async login(): Promise<LoginResult> {
    const result = await this._login();
    this.loginResult = result;
    return result;
  }

  private async _login(): Promise<LoginResult> {
    // Get authentication token.
    const authInfo = await this.getAuthToken();

    // Get MFA factors.
    const factors = await this.getFactors(authInfo.authToken);

    // Find the factor matching the provided email user.
    const factor = this.findEmailFactor(factors);

    // Request MFA token for the factor.
    const mfaToken = await this.requestMfaCode(factor, authInfo);

    // Retrieve MFA code from email server.
    const mfaCode = await this.getMfaCodeFromEmail();

    // Submit the MFA code and the MFA token.
    const mfaSubmitResponse = await this.submitMfaCode(
      authInfo.authToken,
      mfaToken,
      mfaCode
    );

    // Verify the code. Note: This is really only a debug thing for now.
    await this.verifyAuthToken(
      authInfo.authenticated,
      mfaSubmitResponse.authorization
    );

    // Kick off a new session.
    const sessionResponse = await this.newSession(mfaSubmitResponse.token);

    return {
      serialNumber: sessionResponse.serialNumber,
      sessionExpires: mfaSubmitResponse.tokenExpires,
      token: sessionResponse.token,
      userId: sessionResponse.userId,
    };
  }

  async getAuthToken(): Promise<AuthResponse> {
    const request: HttpRequest = {
      body: {
        EnvSource: 'prod',
        email: this.config.arloUser,
        language: 'en',
        password: this.config.arloPassword,
      },
      headers: this.headers(),
      url: AUTH_URLS_MFA.GET_AUTH_TOKEN,
      verb: 'POST',
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
    return (
      await this.httpRequest<MfaFactorResponse>({
        headers: Object.assign(this.headers(), { authorization: token }),
        url: `${AUTH_URLS_MFA.GET_FACTORS}${token}`,
        verb: 'GET',
      })
    ).items;
  }

  async verifyAuthToken(
    authenticated: number,
    headerToken: string
  ): Promise<VerifyResponse> {
    return await this.httpRequest<VerifyResponse>({
      headers: Object.assign(this.headers(), { authorization: headerToken }),
      url: `${AUTH_URLS_MFA.VERIFY_AUTH}${authenticated}`,
      verb: 'GET',
    });
  }

  async requestMfaCode(
    factor: MfaFactor,
    auth: AuthResponse
  ): Promise<MfaRequestResponse> {
    return await this.httpRequest<MfaRequestResponse>({
      body: {
        factorId: factor.factorId,
        factorType: factor.factorType,
        userId: auth.userID,
      },
      headers: Object.assign(this.headers(), { authorization: auth.authToken }),
      url: AUTH_URLS_MFA.REQUEST_MFA_CODE,
      verb: 'POST',
    });
  }

  /**
   * Retrieves Arlo MFA code from email. The email is expected to be unread.
   * Will retry 3-times with a five-second delay between attempts.
   */
  async getMfaCodeFromEmail(): Promise<number> {
    const emailConfig: ImapSimpleOptions = {
      imap: {
        authTimeout: 3000,
        host: this.config.emailServer,
        password: this.config.emailPassword,
        port: this.config.emailImapPort,
        tls: true,
        tlsOptions: {
          servername: this.config.emailServer,
        },
        user: this.config.emailUser,
      },
    };

    const maxTries = 4;
    const oneSecond = 1000;
    for (let i = 0; i < maxTries; ++i) {
      try {
        // eslint-disable-next-line no-await-in-loop
        return await this._getMfaCodeFromEmail(emailConfig);
      } catch (e) {
        // Throw the exception if we're at the last iteration.
        if (i + 1 === maxTries) {
          throw e;
        }
      }
      // eslint-disable-next-line no-await-in-loop
      await this.delay(oneSecond * 5);
    }

    throw new Error('Unable to retrieve MFA code');
  }

  async submitMfaCode(
    token: string,
    mfaRequestResponse: MfaRequestResponse,
    mfaCode: number
  ): Promise<MfaAuth> {
    const response = await this.httpRequest<MfaAuthResponse>({
      body: {
        factorAuthCode: mfaRequestResponse.factorAuthCode,
        isBrowserTrusted: true,
        otp: mfaCode,
      },
      headers: Object.assign(this.headers(), { authorization: token }),
      url: AUTH_URLS_MFA.SUBMIT_MFACODE,
      verb: 'POST',
    });

    return {
      authorization: Buffer.from(response.token).toString('base64'),
      token: response.token,
      tokenExpires: response.expiresIn,
    };
  }

  async newSession(token: string): Promise<SessionResponse> {
    return await this.httpRequest<SessionResponse>({
      headers: Object.assign(this.headers(), { authorization: token }),
      url: AUTH_URLS_MFA.START_NEW_SESSION,
      verb: 'GET',
    });
  }

  /**
   * - Connects to IMAP INBOX
   * - Searches for any emails which are unseen and have an Arlo auth code subject
   * - Marks retrieved emails as seen
   * - Finds most recent email if there are multiple
   * - Parses email body to retrieve code
   */
  private async _getMfaCodeFromEmail(
    emailConfig: ImapSimpleOptions
  ): Promise<number> {
    return await imaps
      .connect(emailConfig)
      .then((connection: imaps.ImapSimple) => {
        return connection.openBox('INBOX').then(() => {
          const searchCriteria = [
            ['UNSEEN'],
            ['SUBJECT', 'Your one-time authentication code from Arlo'],
          ];

          const fetchOptions = {
            bodies: ['TEXT'],
            markSeen: true,
            struct: true,
          };

          return connection
            .search(searchCriteria, fetchOptions)
            .then(async (results: imaps.Message[]) => {
              if (results.length === 0) {
                throw new Error('No emails found matching search criteria');
              }

              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-ignore - Reason: the typing in the library is incorrect
              results.sort((a, b) => b.seqNo - a.seqNo);

              const body = results[0].parts[0].body as string;
              const email = await simpleParser(body);
              if (typeof email.html === 'boolean') {
                throw new Error('Somehow the html property is a boolean');
              }

              // Note: As of 2023-02-22 there is a single header which contains the code
              // This section is very error-prone and makes a lot of assumptions based on current state
              const root = parse(email.html);
              const codes = root.querySelector('h1')?.innerText.match(/\d{6}/);
              if (codes === undefined || codes === null) {
                throw new Error('Unable to find a matching code');
              }

              return Number.parseInt(codes[0]);
            });
        });
      });
  }

  public async httpRequest<T>(request: HttpRequest): Promise<T> {
    const options = {
      data: request.body,
      headers: request.headers,
      method: request.verb,
      responseType: request.responseType,
      url: request.url,
      withCredentials: true,
    };

    const response = (await this.axiosClient<ArloResponse<T>>(options)).data;

    if (response.success || response.meta?.code === 200) {
      return response.data;
    }

    throw new Error(
      `Error code received ${response.meta.code}: ${response.meta.message}`
    );
  }

  /**
   * Get arlo account devices
   * @param {[string]} deviceType - Optional. Filter devices by device type. Example: ['basestation', 'camera']
   * @param {boolean} filterProvisioned - Optional. Filter devices by provisioned status. A null value will return all devices.
   * @returns {Promise<DEVICE_RESPONSE[]>} Arlo account devices
   */
  public async getDevices(
    deviceType?: string[],
    filterProvisioned?: boolean
  ): Promise<DEVICE_RESPONSE[]> {
    let devices = await this.httpRequest<DEVICE_RESPONSE[]>({
      headers: this.authenticatedHeaders(),
      url: ARLO_URLS.DEVICES,
      verb: 'GET',
    });

    if (deviceType && deviceType.length > 0) {
      devices = devices.filter((device) =>
        deviceType.includes(device.deviceType)
      );
    }
    if (typeof filterProvisioned === 'boolean') {
      if (filterProvisioned) {
        devices = devices.filter((device) => device.state === 'provisioned');
      } else {
        devices = devices.filter((device) => device.state !== 'provisioned');
      }
    }

    return devices;
  }

  /**
   * Get specific arlo device
   * @param {Object: DEVICE_RESPONSE} device - Device to get. Include as many device properties as you want to filter for.
   * @returns {Promise<DEVICE_RESPONSE>} Arlo device
   * @throws {Error} If an error occurs
   */
  public async getDevice(
    device: Partial<DEVICE_RESPONSE>
  ): Promise<DEVICE_RESPONSE> {
    const devices: DEVICE_RESPONSE[] = await this.getDevices();

    const chosenDevice: DEVICE_RESPONSE | undefined = devices.find((dev) => {
      for (const key in device) {
        if (device[key] !== dev[key]) {
          return false;
        }
      }
      return true;
    });

    assert(chosenDevice, 'Failed to get device with given properties');

    return chosenDevice;
  }

  private findEmailFactor(factors: Array<MfaFactor>): MfaFactor {
    const factor = factors.find((factor) =>
      stringsEqualInsensitive(factor.displayName, this.config.emailUser)
    );

    assert(
      factor,
      `Unable to find a MFA option matching configured email address '${this.config.emailUser}'`
    );

    return factor;
  }

  private headers(): HEADERS_TYPE {
    return {
      'Auth-Version': '2',
      'Content-Type': 'application/json',
      DNT: '1',
      Origin: `https://${ARLO_URLS.BASE_URL}`,
      Referer: `https://${ARLO_URLS.BASE_URL}/`,
      TE: 'Trailers',
      Source: 'arloCamWeb',
      schemaVersion: '1',
      'User-Agent':
        'Mozilla/5.0 (iPhone; CPU iPhone OS 11_1_2 like Mac OS X) AppleWebKit/604.3.5 (KHTML, like Gecko) Mobile/15B202 NETGEAR/v1 (iOS Vuezone)',
    };
  }

  private delay = (ms: number): Promise<void> =>
    new Promise((resolve) => setTimeout(resolve, ms));
}
