import { importantDates } from "@/lib/importantDatesData";

const regEntry = importantDates.find((e) => e.label === "Registration");
const regPeriodEn = regEntry && regEntry.type !== "text" ? regEntry.valueDisplay : "";
const regPeriodKo = regEntry && regEntry.type !== "text" ? (regEntry.valueDisplayKo ?? regEntry.valueDisplay) : "";

export const overviewPage = {
  en: {
    overviewPage: {
      heroTitle: "Overview",
      overview: {
        title: "About",
        hostSponsorLookupName: "Tom Lee Sedation Dental Group",
        table: [
          { label: "Event", value: "Tomlee Open 2026" },
          {
            label: "Format",
            value:
              "The preliminaries will be held in a round-robin group format, with match schedules and locations arranged freely through mutual agreement between teams.",
          },
          { label: "Hosted by", value: "Dr. Tom Lee Sedation Dental Group" },
          { label: "Organized by", value: "Tomlee Open Organizing Committee" },
        ],
      },
      importantDatesTitle: "Important dates",
      categories: {
        title: "Categories",
        footerNotes: [
          "Levels based on NTRP; doubles levels are the total of both players' ratings.",
          "Categories may be merged or adjusted depending on participant numbers.",
          "Organizers may adjust level placements if needed.",
        ],
      },
      categoriesTableHeaderCategory: "Category",
      categoriesTableHeaderTier: "Tier",
      categoriesTableHeaderNtrp: "NTRP",
      prizes: {
        title: "Prizes",
        tableHeaders: ["Match type", "Bracket", "1st", "2nd", "3rd", "4th"],
      },
    },
    registrationDetail: {
      title: "Registration detail",
      registrationPeriodLabel: "Registration period",
      registrationPeriodValue: regPeriodEn,
      eligibilityLabel: "Eligibility",
      eligibilityValue: "Open to Koreans or teams with one Korean player available",
      feeLabel: "Fee",
      feeValue: "$50 per player (non-refundable)",
      paymentDetailsLabel: "Payment details",
      inquiryLabel: "Inquiry",
      inquiryKakaoPrefix: "KakaoTalk open chat",
      inquiryEmailPrefix: "Email",
    },
  },
  ko: {
    overviewPage: {
      heroTitle: "개요",
      overview: {
        title: "대회 요강",
        hostSponsorLookupName: "Tom Lee Sedation Dental Group",
        table: [
          { label: "대회명", value: "탐리오픈 2026" },
          {
            label: "대회 형식",
            value:
              "예선은 라운드로빈 조별 형식으로 진행되며, 경기 일정과 장소는 팀 간 협의를 통해 자유롭게 조율합니다.",
          },
          { label: "주최", value: "Dr. Tom Lee Sedation Dental Group" },
          { label: "주관", value: "탐리오픈 운영 위원회" },
        ],
      },
      importantDatesTitle: "중요 일정",
      categories: {
        title: "대회 종목",
        footerNotes: [
          "레벨은 NTRP 기준이며, 복식 레벨은 두 선수 점수의 합으로 산정됩니다.",
          "참가 인원에 따라 카테고리가 통합되거나 조정될 수 있습니다.",
          "운영진은 필요 시 레벨 배치를 조정할 수 있습니다.",
        ],
      },
      categoriesTableHeaderCategory: "종목",
      categoriesTableHeaderTier: "등급",
      categoriesTableHeaderNtrp: "NTRP",
      prizes: {
        title: "상금",
        tableHeaders: ["경기 부문", "참가 규모", "1위", "2위", "3위", "4위"],
      },
    },
    registrationDetail: {
      title: "등록 안내",
      registrationPeriodLabel: "등록 기간",
      registrationPeriodValue: regPeriodKo,
      eligibilityLabel: "참가 자격",
      eligibilityValue: "한국인 또는 한 명 이상의 한국인 선수가 포함된 팀",
      feeLabel: "참가비",
      feeValue: "1인 $50 (환불 불가)",
      paymentDetailsLabel: "결제 방법",
      inquiryLabel: "문의",
      inquiryKakaoPrefix: "카카오톡 오픈채팅",
      inquiryEmailPrefix: "이메일",
    },
  },
} as const;
