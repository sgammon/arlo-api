import * as dotenv from 'dotenv';
import { Basestation } from '../basestation';
import { Client } from '../client';
import { LoginResult } from '../interfaces/arlo-auth-interfaces';
import { Configuration } from '../interfaces/configuration';

dotenv.config();

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

    const device = await arlo.getDevice({ deviceType: 'basestation' });

    const basestation = new Basestation(arlo, device);

    basestation.startStream();
  });

  test('it interrogates the basestation', async () => {
    const arlo = new Client(config);

    const loginResult: LoginResult = {
      serialNumber: process.env.SERIAL_NUMBER as string,
      sessionExpires: Number.parseInt(process.env.SESSION_EXPIRES as string),
      token: process.env.TOKEN as string,
      userId: process.env.USER_ID as string,
    };

    arlo._shortCircuitLogin(loginResult);

    const device = await arlo.getDevice({ deviceType: 'basestation' });

    const basestation = new Basestation(arlo, device);

    basestation.startStream();
  });
});
