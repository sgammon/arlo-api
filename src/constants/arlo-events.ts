export interface ArloEvents {
  close: string;
  error: string;
  message: string;
  motionAlert: string;
  open: string;
}

const ARLO_EVENTS: ArloEvents = {
  close: 'close',
  error: 'error',
  message: 'message',
  motionAlert: 'motionAlert',
  open: 'open',
}

export default ARLO_EVENTS;