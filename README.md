# arlo-api

[![CircleCI](https://dl.circleci.com/status-badge/img/gh/wo-d/arlo-api/tree/main.svg?style=svg)](https://dl.circleci.com/status-badge/redirect/gh/wo-d/arlo-api/tree/main)

<a href="https://www.npmjs.com/package/arlo-api"><img title="npm version" src="https://badgen.net/npm/v/arlo-api" ></a>

Thin API for interacting with Arlo

<img src="./images/logo.png" alt="arlo-api-logo" width='162' />

## Usage

```ts
import { Basestation } from './basestation';

const arlo = new Client(config);

// `result` contains necessary information to make further requests
// allowing you to consume just the login result in your library.
const result = await arlo.login();

// Now that arlo has been logged in get the device matching type basestation.
const device = await arlo.getDevice({ deviceType: 'basestation' });

// Construct a new basestation object using our arlo client and the the basestation device.
const basestation = new Basestation(arlo, device);

// Setup event listeners.
basestation.on(ARLO_EVENTS.open, () => {});

basestation.on(ARLO_EVENTS.close, () => {});

// Start event stream.
await basestation.startStream();
```

### Authentication

Currently, email is the only supported MFA method. Caveat I've only tested with Gmail.

#### Configuration

```ts
{
  arloUser: 'something@somewhere.com',
  arloPassword: 'super secret password',
  emailUser: 'myemail@gmail.com',
  emailPassword: 'another secret password',
  emailServer: 'imap.gmail.com',
  emailImapPort: 993
}
```

The `emailUser` must match one of the configured MFA sources in Arlo.

#### Gmail

Gmail has certain limitations when trying to connect from a third party app using just username and password. As of May 2022 Google blocked "less secure apps" from accessing their email services. You have to [manually opt in](https://support.google.com/accounts/answer/6010255?hl=en) and then set up a separate password for a third party. Additionally, you must [enable IMAP](https://support.google.com/mail/answer/7126229?hl=en) in Gmail.

### Tests

Tests make use of `dotenv` package for providing environment variables to the running process.

Create a `.env` file at the root of the solution and supply it with whatever your secrets are.

```
ARLO_USER="user@gmail.com"
ARLO_PASSWORD="password"
EMAIL_USER="other_user@gmail.com"
EMAIL_PASSWORD="password2"
```

You can also skip the login flow if you've already received a login result object and instead use the following secrets.

```
SERIAL_NUMBER="serial"
SESSION_EXPIRES="session_expiration"
TOKEN="token"
USER_ID="userId"
```

And then use the provided `_shortCircuitLogin` method.

```ts
const arlo = new Client(config);

const loginResult: LoginResult = {
  serialNumber: process.env.SERIAL_NUMBER as string,
  sessionExpires: Number.parseInt(process.env.SESSION_EXPIRES as string),
  token: process.env.TOKEN as string,
  userId: process.env.USER_ID as string,
};

arlo._shortCircuitLogin(loginResult);
```

### References

Based on [JOHNEPPILLAR's](https://github.com/JOHNEPPILLAR/arlo) and [easton36's](https://github.com/easton36/arlo.js) great work.
