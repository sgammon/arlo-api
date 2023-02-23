# arlo-api

Thin API for authenticating with Arlo

<img src="./images/logo.png" alt="arlo-api-logo" width='162' />

### Authentication

Currently, email is the only supported MFA method. Caveat I've only tested with Gmail.

### Configuration

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

### Usage

```ts
const arlo = new ArloAuthenticator(config);

const result = await arlo.login();
```

`result` will contain the necessary information to make further requests.

`login` method will not throw an exception but when errors are encountered will instead return a rejected promise.

### References

Based on [JOHNEPPILLAR's great work.](https://github.com/JOHNEPPILLAR/arlo)
