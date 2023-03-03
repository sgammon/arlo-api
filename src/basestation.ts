import { AxiosResponse } from 'axios';
import { EventEmitter } from 'events';
import { Camera } from './camera';
import { Client } from './client';
import ARLO_EVENTS from './constants/arlo-events';
import ARLO_URLS from './constants/arlo-urls';
import {
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
  streaming: boolean;
  pingInterval: NodeJS.Timer | null;

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
    this.streaming = false;
    this.pingInterval = null;
  }

  /**
   * Send a command to the basestation (control cameras, etc)
   * @param {NOTIFY_PAYLOAD} payload - payload to send to the basestation
   * @returns {Promise<void>}
   */
  public notifyDevice(payload: NOTIFY_PAYLOAD): Promise<void> {
    return new Promise<void>(async (resolve) => {
      if (!this.streaming) {
        await this.startStream();
      }
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

      const processData = (data: any): void => {
        if (data.transId === transId) {
          this.removeListener(ARLO_EVENTS.message, processData);
          resolve(data);
        }
      };

      this.on(ARLO_EVENTS.message, processData);
    });
  }

  /**
   * Ping the basestation, keeps the event stream alive
   */
  private async ping(): Promise<void> {
    const data = await this.notifyDevice({
      action: 'set',
      properties: {
        devices: [this.basestation.deviceId],
      },
      publishResponse: false,
      resource: `subscriptions/${this.userId}_web`,
    });

    this.emit('pong', data);
  }

  /**
   * Start event stream for the basestation
   */
  public async startStream(): Promise<void> {
    this.streaming = true;

    const response: AxiosResponse = await this.client.axiosClient.get(
      ARLO_URLS.SUBSCRIBE,
      {
        headers: {
          ...this.headers,
          xcloudId: this.basestation.xCloudId,
          Accept: 'text/event-stream',
        },
        responseType: 'stream',
      }
    );

    const stream = response.data;

    stream.on('data', (data: any) => this.message(data));
    stream.on('error', (error: any) => this.error(error));

    // Ping event stream every 30 seconds
    this.pingInterval = setInterval(() => this.ping(), 30 * 1000);

    return;
  }

  private message(event: Buffer): boolean {
    const message = event
      .toString()
      .replace('event: message\ndata: ', '')
      .replace('\n\n\n', '');

    if (isEmptyOrSpaces(message)) {
      return this.error('Unable to parse message as no data was found');
    }

    let data = { status: '', action: '', reason: '' };

    try {
      data = JSON.parse(message);
    } catch (e) {
      return this.error(
        `Unhandled exception when trying to parse event data: ${message}`
      );
    }

    if (data?.status === 'connected') {
      return this.emit(ARLO_EVENTS.open, 'Event stream opened');
    }
    if (data?.action === 'logout' || data?.status === 'disconnected') {
      return this.emit(
        ARLO_EVENTS.close,
        `Event stream disconnected: ${data.reason}`
      );
    }

    return this.emit(ARLO_EVENTS.message, data);
  }

  private error(error: any): boolean {
    this.streaming = false;
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
   * Get the current basestation state
   */
  public async getState(): Promise<void> {
    return await this.notifyDevice({
      action: 'get',
      publishResponse: false,
      resource: 'basestation',
    });
  }

  /**
   * Get the current state of the cameras attached to the basestation
   */
  public async getCamerasState(): Promise<void> {
    return await this.notifyDevice({
      action: 'get',
      publishResponse: false,
      resource: 'camera',
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

  /**
   * Enables receiving alerts when any camera attached to the basestation is triggered
   * Enables the 'motionAlert' event for the basestation.
   */
  public enableMotionAlerts(): boolean {
    this.on(ARLO_EVENTS.message, (data: any) => {
      if (data?.properties?.motionDetected) {
        this.emit(ARLO_EVENTS.motionAlert, data);
      }
    });

    return true;
  }

  /**
   * Create a custom mode
   * @param {string} mode - The name of the mode
   * @returns {Promise<EVENT_STREAM_RESPONSE>}
   */
  public async createCustomMode(mode: string): Promise<void> {
    return await this.notifyDevice({
      action: 'set',
      from: this.userId + '_web',
      properties: {
        active: mode,
      },
      publishResponse: true,
      resource: 'modes',
      to: this.basestation.parentId,
      transId: createTransactionId(),
    });
  }

  /**
   * Arm the cameras attached to the basestation
   * @returns {Promise<EVENT_STREAM_RESPONSE>}
   */
  public async arm(): Promise<void> {
    return await this.createCustomMode('mode1');
  }

  /**
   * Disarm the cameras attached to the basestation
   * @returns {Promise<EVENT_STREAM_RESPONSE>}
   */
  public async disarm(): Promise<void> {
    return await this.createCustomMode('mode0');
  }

  /**
   * Adjust the brightness of a cameras attached to the basestation
   * @param {Camera} camera - An Arlo.js instance of the camera
   * @param {number} brightness - The brightness level. Between -2 and 2, and increments of 1.
   * @returns {Promise<EVENT_STREAM_RESPONSE>}
   */
  public async setBrightness(
    camera: Camera,
    brightness: number
  ): Promise<void> {
    return await this.notifyDevice({
      action: 'set',
      properties: {
        brightness: brightness,
      },
      publishResponse: true,
      resource: 'cameras/' + camera.camera.deviceId,
    });
  }

  /**
   * Toggle a camera on or off
   * @param {Camera} camera - An Arlo.js instance of the camera
   * @param {boolean} on - Whether to turn the camera on or off
   * @returns {Promise<EVENT_STREAM_RESPONSE>}
   */
  public async setCameraOn(camera: Camera, on: boolean): Promise<void> {
    return await this.notifyDevice({
      action: 'set',
      properties: {
        privacyActive: on,
      },
      publishResponse: true,
      resource: 'cameras/' + camera.camera.deviceId,
    });
  }
}
