import { ResponseType } from 'axios';
import { FactorRole, FactorType, Verb } from '../types';

export interface HttpRequest {
  body?: Record<string, any>;
  headers: object;
  responseType?: ResponseType;
  url: string;
  verb: Verb;
}

export interface ArloAuthResponse {
  MFA_State: string;
  authCompleted: boolean;
  authenticated: number;
  expiresIn: number;
  issued: number;
  mfa: boolean;
  token: string;
  type: string;
  userId: string;
}

export interface MfaAuthResponse extends ArloAuthResponse {
  browserAuthCode: string;
}

export interface MfaAuth {
  authorization: string;
  token: string;
  tokenExpires: number;
}

export interface MfaRequestResponse {
  factorAuthCode: string;
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
  applicationId: string;
  applicationName: string;
  displayName: string;
  factorId: string;
  factorNickname: string;
  factorRole: FactorRole;
  factorType: FactorType;
}

export interface VerifyResponse {
  MFA_State: string;
  acceptedPolicy: number;
  country: string;
  currentPolicy: number;
  emailConfirmed: boolean;
  firstName: string;
  language: string;
  lastName: string;
  mfa: boolean;
  mfaSetup: string;
  tokenValidated: boolean;
}

export interface LoginResult {
  serialNumber: string;
  sessionExpires: number;
  token: string;
  userId: string;
}

export interface SessionResponse {
  accountStatus: string;
  appStore: any;
  arlo: boolean;
  arloApp: boolean;
  canUserMigrate: boolean;
  countryCode: string;
  dateCreated: number;
  email: string;
  mailProgramChecked: boolean;
  paymentId: string;
  policyUpdate: boolean;
  serialNumber: string;
  supportsMultiLocation: boolean;
  tocUpdate: boolean;
  token: string;
  userId: string;
  validEmail: boolean;
}

export interface ArloResponse<T> {
  data: T;
  meta: {
    code: number;
    message: string;
  };
  success: boolean;
}
