export interface ArloEvents {
  message: string;
  open: string;
  error: string;
  close: string;
  motionAlert: string;
}

const ARLO_EVENTS: ArloEvents = {
  message: 'message',
  open: 'open',
  close: 'close',
  error: 'error',
  motionAlert: 'motionAlert',
}

export default ARLO_EVENTS;