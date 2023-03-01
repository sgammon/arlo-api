import { ArloAuthenticator } from '../../dist';

describe('distribution', () => {
  test('imports', () => {
    const config = {
      arloUser: 'test',
      arloPassword: 'test',
      emailUser: 'test@gmail.com',
      emailPassword: 'test',
      emailServer: 'imap.gmail.com',
      emailImapPort: 993,
    };

    const authenticator = new ArloAuthenticator(config);

    expect(authenticator).toBeTruthy();
  });
});
