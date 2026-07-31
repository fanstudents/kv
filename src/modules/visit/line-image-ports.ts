import type { VisitBusinessCard } from "./provider-port";

export interface VisitLineImagePort {
  getImageDataUrl(messageId: string): Promise<string>;
  parseBusinessCard(imageDataUrl: string): Promise<VisitBusinessCard>;
}
