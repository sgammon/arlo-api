describe('dist', () => {
  test('imports', () => {
    const config = {
      arloUser: 'test',
      arloPassword: 'test',
      emailUser: 'test@gmail.com',
      emailPassword: 'test',
      emailServer: 'imap.gmail.com',
      emailImapPort: 993
    };

    const { ArloAuthenticator } = require('../../dist/commonjs/index');
    const authenticator = new ArloAuthenticator(config);

    expect(authenticator).toBeTruthy();
  })
})