import { menuLabelForHref } from "./menu";

export const eventPage = {
  en: {
    eventPage: {
      heroTitle: menuLabelForHref("/event", "en"),
      bestPhotoAwards: {
        title: "Best Photo Awards",
        intro:
          "Share your best moments from the Tomlee Open ’26 in the Photo Album. Standout shots will be selected for the Best Photo Awards. More details coming soon.",
        cta: "Go to Photo Album",
      },
    },
  },
  ko: {
    eventPage: {
      heroTitle: menuLabelForHref("/event", "ko"),
      bestPhotoAwards: {
        title: "베스트 포토 어워드",
        intro:
          "탐리 오픈 '26에서의 소중한 순간을 포토 앨범에 공유해 주세요. 가장 돋보이는 사진은 베스트 포토 어워드를 통해 소개됩니다. 참가 방법, 심사 기준, 시상 내역 등 자세한 안내는 이곳에 곧 게시될 예정입니다.",
        cta: "포토 앨범 보기",
      },
    },
  },
} as const;
