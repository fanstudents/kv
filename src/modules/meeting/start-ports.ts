export interface MeetingStartPort {
  create(title?: string): Promise<string | null>;
}
