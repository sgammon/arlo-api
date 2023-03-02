export interface Configuration {
  /**
   * Arlo password
   */
  arloPassword: string;
  /**
   * Arlo user
   */
  arloUser: string;
  /**
   * Email IMAP server port. E.g. 993
   */
  emailImapPort: number;
  /**
   * Email password
   */
  emailPassword: string;
  /**
   * Email IMAP server. E.g. `imap.gmail.com`
   */
  emailServer: string;
  /**
   * Email address registered to receive MFA
   */
  emailUser: string;
}
