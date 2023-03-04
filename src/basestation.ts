import { AxiosResponse } from 'axios';
import { EventEmitter } from 'events';
import { Client } from './client';
import ARLO_EVENTS from './constants/arlo-events';
import ARLO_URLS from './constants/arlo-urls';
import {
  ArloMessage,
  DEVICE_RESPONSE,
  HEADERS_TYPE,
  NOTIFY_PAYLOAD,
} from './interfaces/arlo-interfaces';
import { createTransactionId } from './utils/helpers';
import { assert, isEmptyOrSpaces } from './utils/utils';

// noinspection JSUnusedGlobalSymbols
export class Basestation extends EventEmitter {
  client: Client;
  userId: string;
  headers: HEADERS_TYPE;
  basestation: DEVICE_RESPONSE;
  pingInterval: NodeJS.Timer | null;

  connected: boolean = false;

  constructor(client: Client, basestation: DEVICE_RESPONSE) {
    super();
    assert(
      basestation.deviceType === 'basestation',
      'Device is not a basestation'
    );

    assert(
      client.loginResult,
      'Client must be logged in before constructing a basestation object'
    );

    this.client = client;
    this.userId = client.loginResult.userId;
    this.headers = client.authenticatedHeaders();
    this.basestation = basestation;

    this.pingInterval = null;
  }

  /**
   * Send a command to the basestation (control cameras, etc)
   * @param {NOTIFY_PAYLOAD} payload - payload to send to the basestation
   * @returns {Promise<void>}
   */
  private async notifyDevice(payload: NOTIFY_PAYLOAD): Promise<void> {
    const transId = createTransactionId();

    await this.client.httpRequest({
      body: {
        ...payload,
        from: this.userId + '_web',
        to: this.basestation.deviceId,
        transId: transId,
      },
      headers: {
        ...this.headers,
        xcloudId: this.basestation.xCloudId,
      },
      url: `${ARLO_URLS.NOTIFY}/${this.basestation.deviceId}`,
      verb: 'POST',
    });

    return;
  }

  /**
   * Ping the basestation, keeps the event stream alive
   */
  private async _keepAlive(): Promise<void> {
    // Once we're no longer connected don't fire anymore device notifications.
    if (!this.connected) return;

    const data = await this.notifyDevice({
      action: 'set',
      properties: {
        devices: [this.basestation.deviceId],
      },
      publishResponse: false,
      resource: `subscriptions/${this.userId}_web`,
    });

    this.emit('pong', data);

    // Call subscribe every 20 seconds.
    setTimeout(() => this._keepAlive.call(this), 20 * 1000);
  }

  /**
   * Start event stream for the basestation
   */
  public async startStream(): Promise<void> {
    await this.client.axiosClient.get(
      ARLO_URLS.SUBSCRIBE,
      {
        headers: {
          ...this.headers,
          xcloudId: this.basestation.xCloudId,
          Accept: 'text/event-stream',
        },
        responseType: 'stream',
      }
    ).then((response) => {
      const stream = response.data;
      stream.on('data', (data: any) => this.message(data));
      stream.on('error', (error: any) => this.error(error));
      stream.on('end', () => this.disconnected('stream ended'));
    }).catch((error) => {
      this.error(error);
    });

    return;
  }

  private disconnected(reason: string) {
    this.connected = false;
    return this.emit(
      ARLO_EVENTS.close,
      `Event stream disconnected: ${reason}`
    );
  }

  private parseMessage(message: string): ArloMessage | Error {
    let newMessage = `{${message.replace(
      /^event: message\s*data/,
      '"event": "message", "data"'
    )}}`;

    newMessage = newMessage.replace('“', '"');

    if (isEmptyOrSpaces(newMessage)) {
      new Error('Unable to parse message as no data was found');
    }

    try {
      return JSON.parse(newMessage);
    } catch (e) {
      return new Error(
        `Unhandled exception when trying to parse event data: ${newMessage}`
      );
    }
  }

  private message(event: Buffer): boolean {
    const result = this.parseMessage(event.toString());

    if (result instanceof Error) {
      return this.error(result.toString());
    }

    const data = result.data;
    if (data?.status === 'connected') {
      this.connected = true;
      this._keepAlive();
      return this.emit(ARLO_EVENTS.open, 'Event stream opened');
    }
    if (data?.action === 'logout' || data?.status === 'disconnected') {
      this.disconnected(data.reason ?? '');
    }

    return this.emit(ARLO_EVENTS.message, data);
  }

  private error(error: any): boolean {
    return this.emit(ARLO_EVENTS.error, error);
  }

  /**
   * Closes the event stream
   * @returns {Promise<void>}
   */
  public async close(): Promise<void> {
    await this.client.httpRequest({
      headers: {
        ...this.headers,
        xcloudId: this.basestation.xCloudId,
      },
      url: ARLO_URLS.UNSUBSCRIBE,
      verb: 'GET',
    });
  }

  /**
   * Restart basestation
   */
  public async restart(): Promise<void> {
    return await this.client.httpRequest({
      body: {
        deviceId: this.basestation.deviceId,
      },
      headers: this.headers,
      url: ARLO_URLS.RESTART_BASESTATION,
      verb: 'POST',
    });
  }

  /**
   * Enables receiving explicit doorbell events. The associated event
   * is ARLO_EVENTS.doorbellAlert
   */
  public enableDoorbellAlerts(): boolean {
    this.on(ARLO_EVENTS.message, (data: any) => {
      if (data?.properties?.buttonPressed) {
        this.emit(ARLO_EVENTS.doorbellAlert, data);
      }
    });

    return true;
  }
}
