export interface DEVICE_RESPONSE {
  deviceId: string;
  deviceName: string;
  deviceType: string;
  displayOrder: number;
  lastImageUploaded: string;
  lastModified: number;
  owner: {
    firstName: string;
    lastName: string;
    ownerId: string;
  };
  parentId: string;
  properties: {
    modelId: string;
    olsonTimeZone: string | null;
    hwVersion: string;
  };
  state: string;
  uniqueId: string;
  userId: string;
  userRole: string;
  xCloudId: string;
  [key: string]: any;
}

export interface HEADERS_TYPE {
  [key: string]: string;
}

export interface NOTIFY_PAYLOAD {
  action: string;
  from?: string;
  properties?: {
    [key: string]: any;
  };
  publishResponse: boolean;
  resource: string;
  to?: string;
  transId?: string;
}

export interface EVENT_STREAM_RESPONSE {
  resource: string;
  action: string;
  transId: string;
  to: string;
  from: string;
  properties: {
    [key: string]: any;
  };
}

export interface START_STREAM_RESPONSE {
  url: string;
}

export interface ArloMessage {
  event: string;
  data: {
    action?: string;
    reason?: string;
    status?: string;
  };
}