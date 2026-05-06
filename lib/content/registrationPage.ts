import { importantDates } from "@/lib/importantDatesData";

const regEntry = importantDates.find((e) => e.label === "Registration");
const regPeriodEn = regEntry && regEntry.type !== "text" ? regEntry.valueDisplay : "";
const regPeriodKo = regEntry && regEntry.type !== "text" ? (regEntry.valueDisplayKo ?? regEntry.valueDisplay) : "";

export const registrationPage = {
  en: {
    registrationPage: {
      heroTitle: "Registration",
      ctaSectionTitle: "Ready to register?",
      ctaSubmitLabel: "Register",
      notYetOpenTitle: "Registration is not yet open",
      notYetOpenMessage: "Registration opens {date}.",
      closedTitle: "Registration has closed",
      closedMessage: "The registration period ({period}) has ended.",
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
    contact: {
      title: "Contact",
    },
    contactTable: {
      generalLabel: "General",
      email: "Email",
      kakaoTalk: "KakaoTalk",
      instagram: "Instagram",
      website: "Website",
      openChat: "Open Chat",
      generalMessage: "Questions about the tournament, registration, or venue?",
    },
  },
  ko: {
    registrationPage: {
      heroTitle: "참가 등록",
      ctaSectionTitle: "등록할 준비가 되셨나요?",
      ctaSubmitLabel: "등록하기",
      notYetOpenTitle: "아직 등록 기간이 아닙니다",
      notYetOpenMessage: "등록은 {date}부터 시작됩니다.",
      closedTitle: "등록이 마감되었습니다",
      closedMessage: "등록 기간({period})이 종료되었습니다.",
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
    contact: {
      title: "문의",
    },
    contactTable: {
      generalLabel: "일반",
      email: "이메일",
      kakaoTalk: "카카오톡",
      instagram: "인스타그램",
      website: "웹사이트",
      openChat: "오픈채팅",
      generalMessage: "대회, 등록, 장소 문의는 아래로 연락 주세요.",
    },
  },
} as const;
