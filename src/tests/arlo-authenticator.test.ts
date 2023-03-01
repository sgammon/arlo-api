import { Camera } from '../camera';
import { Client } from '../client';
import { Configuration } from '../interfaces/configuration';
import * as dotenv from 'dotenv'

dotenv.config()

const config: Configuration = {
  arloUser: process.env.ARLO_USER as string,
  arloPassword: process.env.ARLO_PASSWORD as string,
  emailUser: process.env.EMAIL_USER as string,
  emailPassword: process.env.EMAIL_PASSWORD as string,
  emailServer: 'imap.gmail.com',
  emailImapPort: 993,
};

/**
 * These tests just provide a convenient debug point and therefore
 * have no assertions.
 */
describe('arlo-authenticator', function () {
  test('scrapes emails', async () => {
    const arlo = new Client(config);

    const code = await arlo.getMfaCodeFromEmail();
  });

  test('logs in to Arlo', async () => {
    const arlo = new Client(config);

    const result = await arlo.login();

    const device = await arlo.getDevice({ deviceType: 'doorbell' });

    const camera = new Camera(arlo, device);

    const alerts = await camera.getSmartAlerts();
  });
});
