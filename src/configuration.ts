export interface Configuration {
    /**
     * Arlo user
     */
    arloUser: string,
    /**
     * Arlo password
     */
    arloPassword: string,
    /**
     * Email address registered to receive MFA
     */
    emailUser: string,
    /**
     * Email password
     */
    emailPassword: string,
    /**
     * Email IMAP server. E.g. `imap.google.com`
     */
    emailServer: string,
    /**
     * Email IMAP server port. E.g. 993
     */
    emailImapPort: number,
}