# arlo-api

<a href="https://www.npmjs.com/package/arlo-api"><img title="npm version" src="https://badgen.net/npm/v/arlo-api" ></a>

Thin API for interacting with Arlo

<img src="./images/logo.png" alt="arlo-api-logo" width='162' />

## Usage

```ts
const arlo = new Client(config);

// `result` contains necessary information to make further requests
// allowing you to consume just the login result in your library.
const result = await arlo.login();

// Now that arlo has been logged in get the device matching type doorbell.
const device = await arlo.getDevice({ deviceType: 'doorbell' });

// Construct a new camera object using our arlo client and the the doorbell device.
const camera = new Camera(arlo, device);

// Interact with the camera object.
const alerts = await camera.getSmartAlerts();
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

### References

Based on [JOHNEPPILLAR's](https://github.com/JOHNEPPILLAR/arlo) and [easton36's](https://github.com/easton36/arlo.js) great work.
