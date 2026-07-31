export interface VisitSettings {
  rangeStartDays: number;
  rangeEndDays: number;
  meetingDuration: number;
  meetingType: string;
  workingHoursStart: string;
  workingHoursEnd: string;
  senderName: string;
  requireApproval: boolean;
}

export interface VisitSettingsPort {
  get(): Promise<VisitSettings>;
}
