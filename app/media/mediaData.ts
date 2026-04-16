/** Shared outlet labels for media card metadata. */
export const MEDIA_OUTLET_LABELS: Record<string, string> = {
  "The Joong Ang": "중앙일보",
  Vanchosun: "밴조선",
};

/** Korean copy overrides for specific media cards (by stable Media.id). */
export const MEDIA_KO_COPY_BY_ID: Record<string, { title: string; subtitle: string | null }> = {
  "media-joongang-2025-tomlee-open": {
    title: "캐나다 | 밴쿠버 한인 테니스 축제 '2025 탐리오픈' 성황리에 막 내려",
    subtitle: "두 달간의 열전, 126경기의 대장정",
  },
  "media-vanchosun-2025-tomlee-open": {
    title: "밴쿠버의 한인 테니스 최강자 가린다",
    subtitle: "톰리오픈 7월 5일부터 두 달간 대장정",
  },
  "media-video-2025-recap": {
    title: "2025 탐리 오픈 리캡",
    subtitle: null,
  },
};
