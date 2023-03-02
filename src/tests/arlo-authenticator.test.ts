import ArloAuthenticator from '../arlo-authenticator';
import { Configuration } from '../configuration';

const config: Configuration = {
  emailImapPort: -1,
  emailPassword: 'a',
  emailServer: 'a',
  emailUser: 'a',
  arloUser: 'a',
  arloPassword: 'a',
};

/**
 * These tests just provide a convenient debug point and therefore
 * have no assertions.
 */
describe('arlo-authenticator', function () {
  test('scrapes emails', async () => {
    const arlo = new ArloAuthenticator(config);

    //const code = await arlo.getMfaCodeFromEmail();
  });

  test('logs in to Arlo', async () => {
    const arlo = new ArloAuthenticator(config);

    //const result = await arlo.login();
  });
});
