const API_DOMAIN = 'myapi.arlo.com';

export interface ArloUrls {
    API_ROOT: string,
    BASE_URL: string,
    WEB: string,
    LOGOUT: string,
    WEB_CLIENT: string,
    SUBSCRIBE: string,
    UNSUBSCRIBE: string,
    WEB_USERS: string,
    DEVICES_V2: string,
    DEVICES: string,
    DEVICE: string,
    AUTOMATIONACTIVE: string,
    SERVICE_LEVEL_SETTINGS: string,
    SERVICE_LEVELS: string,
    CAPABILITIES: string,
    FEATURES: string,
    EMERGENCY_LOCATIONS: string,
    NOTIFY: string,
    START_STREAM: string,
    STOP_STREAM: string,
    SNAPSHOT: string,
    LIBRARY_SUMMARY: string,
    LIBRARY: string,
    START_NEW_SESSION: string,
}

const ARLO_URLS: ArloUrls = {
    API_ROOT: "",
    AUTOMATIONACTIVE: "",
    BASE_URL: "",
    CAPABILITIES: "",
    DEVICE: "",
    DEVICES: "",
    DEVICES_V2: "",
    EMERGENCY_LOCATIONS: "",
    FEATURES: "",
    LIBRARY: "",
    LIBRARY_SUMMARY: "",
    LOGOUT: "",
    NOTIFY: "",
    SERVICE_LEVELS: "",
    SERVICE_LEVEL_SETTINGS: "",
    SNAPSHOT: "",
    START_NEW_SESSION: "",
    START_STREAM: "",
    STOP_STREAM: "",
    SUBSCRIBE: "",
    UNSUBSCRIBE: "",
    WEB: "",
    WEB_CLIENT: "",
    WEB_USERS: ""
};

ARLO_URLS.API_ROOT = `https://${API_DOMAIN}`;
ARLO_URLS.BASE_URL = 'my.arlo.com';
ARLO_URLS.WEB = `${ARLO_URLS.API_ROOT}/hmsweb`;
ARLO_URLS.LOGOUT = `${ARLO_URLS.WEB}/logout`;
ARLO_URLS.WEB_CLIENT = `${ARLO_URLS.WEB}/client`;
ARLO_URLS.SUBSCRIBE = `${ARLO_URLS.WEB_CLIENT}/subscribe`;
ARLO_URLS.UNSUBSCRIBE = `${ARLO_URLS.WEB_CLIENT}/unsubscribe`;
ARLO_URLS.WEB_USERS = `${ARLO_URLS.WEB}/users`;
ARLO_URLS.DEVICES_V2 = `${ARLO_URLS.WEB}/v2/users/devices`;
ARLO_URLS.DEVICES = `${ARLO_URLS.WEB_USERS}/devices`;
ARLO_URLS.DEVICE = `${ARLO_URLS.WEB_USERS}/device`;
ARLO_URLS.AUTOMATIONACTIVE = `${ARLO_URLS.DEVICES}/automation/active`;
ARLO_URLS.SERVICE_LEVEL_SETTINGS = `${ARLO_URLS.WEB_USERS}/serviceLevel/settings`;
ARLO_URLS.SERVICE_LEVELS = `${ARLO_URLS.WEB_USERS}/serviceLevel/v4`;
ARLO_URLS.CAPABILITIES = `${ARLO_URLS.WEB_USERS}/capabilities`;
ARLO_URLS.FEATURES = `${ARLO_URLS.WEB_USERS}/subscription/smart/features`;
ARLO_URLS.EMERGENCY_LOCATIONS = `${ARLO_URLS.WEB_USERS}/emergency/locations`;
ARLO_URLS.NOTIFY = `${ARLO_URLS.DEVICES}/notify`;
ARLO_URLS.START_STREAM = `${ARLO_URLS.DEVICES}/startStream`;
ARLO_URLS.STOP_STREAM = `${ARLO_URLS.DEVICES}/stopStream`;
ARLO_URLS.SNAPSHOT = `${ARLO_URLS.DEVICES}/fullFrameSnapshot`;
ARLO_URLS.LIBRARY_SUMMARY = `${ARLO_URLS.WEB_USERS}/library/metadata`;
ARLO_URLS.LIBRARY = `${ARLO_URLS.WEB_USERS}/library`;
ARLO_URLS.START_NEW_SESSION = `https://${API_DOMAIN}/hmsweb/users/session/v2`;

export default ARLO_URLS;