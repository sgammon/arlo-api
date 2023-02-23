import { FactorRole, FactorType, Verb } from '../types';

export interface HttpRequest {
  verb: Verb;
  url: string;
  body?: Record<string, any>;
  headers: object;
}

export interface ArloAuthResponse {
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

export interface MfaAuthResponse extends ArloAuthResponse {
  browserAuthCode: string;
}

export interface MfaAuth {
  token: string;
  authorization: string;
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
  factorId: string;
  factorType: FactorType;
  displayName: string;
  factorNickname: string;
  applicationId: string;
  applicationName: string;
  factorRole: FactorRole;
}

export interface VerifyResponse {
  firstName: string;
  lastName: string;
  country: string;
  language: string;
  acceptedPolicy: number;
  currentPolicy: number;
  emailConfirmed: boolean;
  mfa: boolean;
  mfaSetup: string;
  MFA_State: string;
  tokenValidated: boolean;
}

export interface LoginResult {
  token: string;
  userId: string;
  serialNumber: string;
  sessionExpires: number;
}

export interface SessionResponse {
  userId: string;
  email: string;
  token: string;
  paymentId: string;
  accountStatus: string;
  serialNumber: string;
  countryCode: string;
  tocUpdate: boolean;
  policyUpdate: boolean;
  appStore: any;
  validEmail: boolean;
  arlo: boolean;
  arloApp: boolean;
  dateCreated: number;
  mailProgramChecked: boolean;
  supportsMultiLocation: boolean;
  canUserMigrate: boolean;
}
