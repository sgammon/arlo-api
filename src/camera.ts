import { CookieJar } from 'tough-cookie';
import { createTransactionId } from './utils/helpers';
import { assert } from './utils/utils';
import ARLO_URLS from './constants/arlo-urls';
import { Client } from './client';
import {
  DEVICE_RESPONSE,
  HEADERS_TYPE,
  START_STREAM_RESPONSE,
} from './interfaces/arlo-interfaces';

/**
 * @param client - Base arlo client instance
 * @param {DEVICE_RESPONSE} camera - device object to initiate
 */
export class Camera {
  client: Client;
  userId: string;
  headers: HEADERS_TYPE;
  public camera: DEVICE_RESPONSE;
  CookieJar: CookieJar;

  constructor(client: Client, camera: DEVICE_RESPONSE) {
    assert(
      camera.deviceType === 'camera' || camera.deviceType === 'doorbell',
      'Device is not a camera or a doorbell'
    );

    assert(
      client.loginResult,
      'Client must be logged in before constructing a camera object'
    );

    this.client = client;
    this.userId = client.loginResult?.userId;
    this.headers = client.authenticatedHeaders();
    this.camera = camera;
    this.CookieJar = client.cookieJar;
  }

  /**
   * @param {string} name - name of the camera
   * @returns {Promise<string>}
   */
  public async setName(name: string): Promise<string> {
    const response = await this.client.httpRequest<string>({
      body: {
        deviceId: this.camera.deviceId,
        deviceName: name,
        parentId: this.camera.parentId,
      },
      headers: this.headers,
      url: ARLO_URLS.SET_DEVICE_NAME,
      verb: 'PUT',
    });

    this.camera.deviceName = name;

    return response;
  }

  /**
   * Get the camera's smart alerts
   */
  public async getSmartAlerts(): Promise<unknown> {
    return await this.client.httpRequest({
      headers: this.headers,
      url: `${ARLO_URLS.DEVICES}/${this.camera.uniqueId}/smartalerts`,
      verb: 'GET',
    });
  }

  /**
   * Get the camera's automation activity zones
   */
  public async getAutomationActivityZones(): Promise<unknown> {
    return await this.client.httpRequest({
      headers: this.headers,
      url: `${ARLO_URLS.DEVICES}/${this.camera.uniqueId}/automation/activityzones`,
      verb: 'GET',
    });
  }

  /**
   * Talk through the camera's speakers
   */
  public async pushToTalk(): Promise<void> {
    return await this.client.httpRequest({
      headers: this.headers,
      url: `${ARLO_URLS.DEVICES}/${this.camera.uniqueId}/pushtotalk`,
      verb: 'GET',
    });
  }

  /**
   * Start streaming the camera's video
   * @returns {Promise<START_STREAM_RESPONSE>} - Includes the url of the RTSP stream
   */
  public async startStreaming(): Promise<START_STREAM_RESPONSE> {
    return await this.client.httpRequest<START_STREAM_RESPONSE>({
      body: {
        action: 'set',
        from: this.userId + '_web',
        properties: {
          activityState: 'startUserStream',
          cameraId: this.camera.deviceId,
        },
        publishResponse: true,
        resource: 'cameras/' + this.camera.deviceId,
        responseUrl: '',
        to: this.camera.parentId,
        transId: createTransactionId(),
      },
      headers: {
        ...this.headers,
        'Content-Type': 'application/json',
        xcloudId: this.camera.xCloudId,
      },
      url: ARLO_URLS.START_STREAM,
      verb: 'POST',
    });
  }
}
