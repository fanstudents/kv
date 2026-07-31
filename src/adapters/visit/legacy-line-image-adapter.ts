import "server-only";
import { getLineMessageContentAsDataUrl } from "@/lib/line";
import { legacyVisitProviders } from "./legacy-provider-adapter";
import type { VisitLineImagePort } from "@/modules/visit/line-image-ports";

export function createLegacyVisitLineImageAdapter(): VisitLineImagePort {
  return {
    getImageDataUrl: getLineMessageContentAsDataUrl,
    parseBusinessCard: legacyVisitProviders.parseBusinessCard,
  };
}
