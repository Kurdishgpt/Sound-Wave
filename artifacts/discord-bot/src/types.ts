export interface Track {
  title: string;
  url: string;
  thumbnail?: string;
  duration: number; // seconds
  durationFormatted: string;
  requestedBy: string; // user ID
  requestedByName: string;
  source: 'youtube' | 'spotify';
  artist?: string;
}

export enum LoopMode {
  NONE = 'none',
  TRACK = 'track',
  QUEUE = 'queue',
}
