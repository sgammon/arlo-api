import { Configuration } from './configuration';
import ARLO_URLS from './constants/arlo-urls';
import AUTH_URLS_MFA from './constants/auth-urls-mfa';
import { CookieJar } from 'tough-cookie';
import { wrapper } from 'axios-cookiejar-support';
import axios, { AxiosInstance } from 'axios';
import { assertDefined, stringsEqualInsensitive } from './utils';
import {
  ArloAuthResponse,
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
import { ImapSimpleOptions } from 'imap-simple';
import * as imaps from 'imap-simple';
import { simpleParser } from 'mailparser';
import parse from 'node-html-parser';

export default class ArloAuthenticator {
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
    return new Promise(async (resolve, reject) => {
      try {
        const loginResult = await this._login();
        resolve(loginResult);
      } catch (e) {
        reject(e);
      }
    });
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
    const verificationResponse = await this.verifyAuthToken(
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
    return (
      await this.httpRequest<MfaFactorResponse>({
        verb: 'GET',
        url: `${AUTH_URLS_MFA.GET_FACTORS}${token}`,
        headers: Object.assign(this.headers(), { authorization: token }),
      })
    ).items;
  }

  async verifyAuthToken(
    authenticated: number,
    headerToken: string
  ): Promise<VerifyResponse> {
    return await this.httpRequest<VerifyResponse>({
      verb: 'GET',
      url: `${AUTH_URLS_MFA.VERIFY_AUTH}${authenticated}`,
      headers: Object.assign(this.headers(), { authorization: headerToken }),
    });
  }

  async requestMfaCode(
    factor: MfaFactor,
    auth: AuthResponse
  ): Promise<MfaRequestResponse> {
    return await this.httpRequest<MfaRequestResponse>({
      verb: 'POST',
      url: AUTH_URLS_MFA.REQUEST_MFA_CODE,
      headers: Object.assign(this.headers(), { authorization: auth.authToken }),
      body: {
        factorId: factor.factorId,
        factorType: factor.factorType,
        userId: auth.userID,
      },
    });
  }

  /**
   * Retrieves Arlo MFA code from email. The email is expected to be unread.
   * Will retry 3-times with a five-second delay between attempts.
   */
  async getMfaCodeFromEmail(): Promise<number> {
    const emailConfig: ImapSimpleOptions = {
      imap: {
        user: this.config.emailUser,
        password: this.config.emailPassword,
        host: this.config.emailServer,
        port: this.config.emailImapPort,
        tls: true,
        authTimeout: 3000,
        tlsOptions: {
          servername: this.config.emailServer,
        },
      },
    };

    const maxTries = 4;
    const oneSecond = 1000;
    for (let i = 0; i < maxTries; ++i) {
      try {
        return await this._getMfaCodeFromEmail(emailConfig);
      } catch (e) {
        // Throw the exception if we're at the last iteration.
        if (i + 1 === maxTries) {
          throw e;
        }
      }
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
      verb: 'POST',
      headers: Object.assign(this.headers(), { authorization: token }),
      url: AUTH_URLS_MFA.SUBMIT_MFACODE,
      body: {
        factorAuthCode: mfaRequestResponse.factorAuthCode,
        isBrowserTrusted: true,
        otp: mfaCode,
      },
    });

    return {
      token: response.token,
      authorization: Buffer.from(response.token).toString('base64'),
      tokenExpires: response.expiresIn,
    };
  }

  async newSession(token: string): Promise<SessionResponse> {
    return await this.httpRequest<SessionResponse>({
      verb: 'GET',
      headers: Object.assign(this.headers(), { authorization: token }),
      url: AUTH_URLS_MFA.START_NEW_SESSION,
    });
  }

  /**
   * - Connects to IMAP INBOX
   * - Searches for any emails which are unseen and have an Arlo auth code subject
   * - Marks retrieved emails as seen
   * - Finds most recent email if there are multiple
   * - Parses email body to retrieve code
   */
  private async _getMfaCodeFromEmail(emailConfig: ImapSimpleOptions) {
    return await imaps.connect(emailConfig).then(function (connection: imaps.ImapSimple) {
      return connection.openBox('INBOX').then(function () {
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
          .then(async function (results: imaps.Message[]) {
            if (results.length === 0) {
              throw new Error('No emails found matching search criteria');
            }

            // @ts-ignore - Reason: the typing in the library is incorrect
            results.sort((a, b) => b.seqNo - a.seqNo);

            const body = results[0].parts[0].body;
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

  private async httpRequest<T>(request: HttpRequest): Promise<T> {
    const options = {
      withCredentials: true,
      method: request.verb,
      headers: request.headers,
      url: request.url,
      data: request.body,
    };

    const response = (await this.axiosClient(options)).data;

    if (response.success || response.meta?.code === 200) {
      return response.data;
    }

    throw new Error(
      `Error code received ${response.meta.code}: ${response.meta.message}`
    );
  }

  private findEmailFactor(factors: Array<MfaFactor>): MfaFactor {
    const factor = factors.find((factor) =>
      stringsEqualInsensitive(factor.displayName, this.config.emailUser)
    );
    if (factor === undefined) {
      throw new Error(
        `Unable to find a MFA option matching configured email address '${this.config.emailUser}'`
      );
    }
    return factor;
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

  private delay = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));
}
