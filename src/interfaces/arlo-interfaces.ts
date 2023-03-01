export interface DEVICE_RESPONSE {
  userId: string;
  deviceId: string;
  parentId: string;
  uniqueId: string;
  deviceType: string;
  deviceName: string;
  lastModified: number;
  xCloudId: string;
  lastImageUploaded: string;
  userRole: string;
  displayOrder: number;
  state: string;
  owner: {
    firstName: string;
    lastName: string;
    ownerId: string;
  };
  properties: {
    modelId: string;
    olsonTimeZone: string | null;
    hwVersion: string;
  };
  [key: string]: any;
}

export interface HEADERS_TYPE {
  [key: string]: string;
}

export interface NOTIFY_PAYLOAD {
  action: string;
  resource: string;
  publishResponse: boolean;
  from?: string;
  to?: string;
  transId?: string;
  properties?: {
    [key: string]: any;
  };
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
