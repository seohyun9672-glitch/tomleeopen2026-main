export const mediaPage = {
  en: {
    mediaPage: {
      heroTitle: "Media",
      tabs: {
        articles: "Articles",
        videos: "Videos",
        photos: "Photos",
      },
      defaultMetaOutlet: "Tomlee Open Final",
      finalYearSectionTitle: (year: number) => `Tomlee Open Final ${year}`,
      viewGallery: "Open photo gallery",
      galleryClose: "Close",
      galleryPrev: "Previous photo",
      galleryNext: "Next photo",
      view: "View",
      noImage: "No image",
      other: "Other",
      emptyState: "Media gallery coming soon",
      featuredVideoDescription:
        "Tomlee Open 2025 was Vancouver's Korean tennis festival: two months of play, over 120 matches, and finals across men's, women's, and mixed doubles and singles. Watch the recap for highlights from the tournament.",
    },
  },
  ko: {
    mediaPage: {
      heroTitle: "미디어",
      tabs: {
        articles: "기사",
        videos: "영상",
        photos: "사진",
      },
      defaultMetaOutlet: "탐리 오픈 결승",
      finalYearSectionTitle: (year: number) => `탐리 오픈 결승 ${year}`,
      viewGallery: "사진 갤러리 열기",
      galleryClose: "닫기",
      galleryPrev: "이전 사진",
      galleryNext: "다음 사진",
      view: "보기",
      noImage: "이미지 없음",
      other: "기타",
      emptyState: "미디어 갤러리 준비 중입니다",
      featuredVideoDescription:
        "2025 탐리 오픈은 밴쿠버 한인 테니스 축제로, 두 달간 120경기가 넘는 대회가 남·녀 단·복식과 혼합 복식 등 부문별로 펼쳐졌습니다. 결승과 하이라이트는 리캡 영상에서 만나 보세요.",
    },
  },
} as const;
