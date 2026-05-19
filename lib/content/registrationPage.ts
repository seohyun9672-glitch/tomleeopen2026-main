import { importantDates } from "@/lib/importantDatesData";
import { contactData } from "@/lib/contactData";

const regEntry = importantDates.find((e) => e.label === "Registration");
const regStartEn = regEntry && regEntry.type === "range"
  ? new Date(regEntry.startDate).toLocaleDateString("en-CA", { month: "long", day: "numeric", year: "numeric" })
  : "";
const regStartKo = regEntry && regEntry.type === "range"
  ? new Date(regEntry.startDate).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })
  : "";
const regPeriodEn = regEntry && regEntry.type === "range" ? regEntry.valueDisplay : "";
const regPeriodKo = regEntry && regEntry.type === "range" ? (regEntry.valueDisplayKo ?? regEntry.valueDisplay) : "";

export const registrationPage = {
  en: {
    registrationPage: {
      heroTitle: "Registration",
      manageHeroTitle: "Manage registration",
      notYetOpenTitle: "Registration is not yet open",
      notYetOpenMessage: `Registration opens ${regStartEn}.`,
      closedTitle: "Registration has closed",
      closedMessage: `The registration period (${regPeriodEn}) has ended.`,
      returningRegistrantButton: "Returning registrant?",
      newRegistrationButton: "New registration",
      lookupTitle: "Your Registration",
      lookupEmailPlaceholder: "Enter your registered email",
      lookupButton: "Look up",
      lookingUpButton: "Looking up...",
      lookupNoResult: "No registration found for this email.",
      lookupError: "Lookup failed. Please try again.",
      editButton: "Edit",
      cancelButton: "Cancel",
      requestRefundButton: "Request refund",
      saveButton: "Save changes",
      savingButton: "Saving...",
      cancelEditButton: "Back",
      confirmationTitle: "Registration complete!",
      confirmationBody: "Your registration has been received. The organizer will be in touch with further details.",
      confirmationClose: "Close",
    },
    registrationForm: {
      sections: {
        playerDetails: "Player details",
        tournamentDetails: "Tournament details",
        paymentDetails: "Payment details",
      },
      fields: {
        categories: "Categories",
        searchCategoriesPlaceholder: "Select categories",
        searchClubsPlaceholder: "Select clubs",
        partnerName: "Partner name",
      },
      buttons: {
        submit: "Submit",
        submitting: "Submitting...",
        saveChanges: "Save changes",
        saving: "Saving...",
        back: "Back",
        lookUp: "Look up",
        lookingUp: "Looking up…",
      },
      options: {
        selectLevel: "Select level",
        statusConfirmed: "Confirmed",
        statusCancelled: "Cancelled",
      },
      helper: {
        etransferSent: "I have sent the e-transfer",
        mediaConsent: "I agree to photos and videos being used for tournament media and social channels.",
      },
      summary: {
        total: "Total",
        etransferTo: "E-transfer to:",
        copyEmail: "Copy",
        emailCopied: "Copied!",
      },
      errors: {
        required: "Required",
        invalidEmail: "Enter a valid email address",
        invalidPhone: "Enter a valid phone number",
        selectAtLeastOneCategory: "Select at least one category",
        partnerNameRequired: "Partner name required for doubles",
        mediaConsentRequired: "Media consent is required",
        etransferSentRequired: "Please confirm you have sent the e-transfer",
        registrationFailed: "Registration failed. Please try again.",
      },
    },
    etransfer: {
      email: contactData.email.link,
    },
  },
  ko: {
    registrationPage: {
      heroTitle: "참가 등록",
      manageHeroTitle: "등록 관리",
      notYetOpenTitle: "아직 등록 기간이 아닙니다",
      notYetOpenMessage: `등록은 ${regStartKo}부터 시작됩니다.`,
      closedTitle: "등록이 마감되었습니다",
      closedMessage: `등록 기간(${regPeriodKo})이 종료되었습니다.`,
      returningRegistrantButton: "이미 등록하셨나요?",
      newRegistrationButton: "새로 등록하기",
      lookupTitle: "등록 내역",
      lookupEmailPlaceholder: "등록한 이메일을 입력하세요",
      lookupButton: "조회",
      lookingUpButton: "조회 중...",
      lookupNoResult: "이 이메일로 등록된 내역이 없습니다.",
      lookupError: "조회에 실패했습니다. 다시 시도해 주세요.",
      editButton: "수정",
      cancelButton: "취소",
      requestRefundButton: "환불 요청",
      saveButton: "변경 저장",
      savingButton: "저장 중...",
      cancelEditButton: "뒤로",
      confirmationTitle: "등록이 완료되었습니다!",
      confirmationBody: "등록이 접수되었습니다. 대회 관련 안내는 추후 별도로 전달될 예정입니다.",
      confirmationClose: "닫기",
    },
    registrationForm: {
      sections: {
        playerDetails: "개인 정보",
        tournamentDetails: "대회 정보",
        paymentDetails: "결제 정보",
      },
      fields: {
        categories: "카테고리",
        searchCategoriesPlaceholder: "카테고리 선택",
        searchClubsPlaceholder: "클럽 검색",
        partnerName: "파트너 이름",
      },
      buttons: {
        submit: "제출",
        submitting: "제출 중...",
        saveChanges: "변경 저장",
        saving: "저장 중...",
        back: "뒤로",
        lookUp: "조회",
        lookingUp: "조회 중…",
      },
      options: {
        selectLevel: "레벨 선택",
        statusConfirmed: "확정",
        statusCancelled: "취소",
      },
      helper: {
        etransferSent: "이체를 완료했습니다",
        mediaConsent: "대회 미디어 및 소셜 채널에 사진/영상 사용에 동의합니다.",
      },
      summary: {
        total: "합계",
        etransferTo: "이체 대상:",
        copyEmail: "복사",
        emailCopied: "복사됨!",
      },
      errors: {
        required: "필수 입력 항목입니다",
        invalidEmail: "올바른 이메일 주소를 입력해 주세요",
        invalidPhone: "올바른 전화번호를 입력해 주세요",
        selectAtLeastOneCategory: "카테고리를 최소 1개 선택해 주세요",
        partnerNameRequired: "복식 카테고리는 파트너 이름이 필요합니다",
        mediaConsentRequired: "미디어 동의는 필수입니다",
        etransferSentRequired: "이체 완료 여부를 확인해 주세요",
        registrationFailed: "등록에 실패했습니다. 다시 시도해 주세요.",
      },
    },
    etransfer: {
      email: contactData.email,
    },
  },
} as const;
