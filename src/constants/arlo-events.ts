export interface ArloEvents {
  close: string;
  doorbellAlert: string;
  error: string;
  message: string;
  motionAlert: string;
  open: string;
}

const ARLO_EVENTS: ArloEvents = {
  close: 'close',
  doorbellAlert: 'doorbellAlert',
  error: 'error',
  message: 'message',
  motionAlert: 'motionAlert',
  open: 'open',
};

export default ARLO_EVENTS;
