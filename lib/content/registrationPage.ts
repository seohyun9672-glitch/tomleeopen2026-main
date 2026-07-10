import { getImportantDates } from "@/lib/importantDatesData";
import { contactData } from "@/lib/contactData";
import { getYear } from "@/lib/utils";

export type EligibilityGroup = {
  label: string;
  content?: string;
  items?: string[];
  subItems?: string[];
  groups?: EligibilityGroup[];
};

export type EligibilityData = {
  label: string;
  content: string;
  groups: EligibilityGroup[];
};

export const eligibilityContent: { en: EligibilityData; ko: EligibilityData } = {
  en: {
    label: "Eligibility and participation rules",
    content:
      "To support fair competition among participants and the growth of recreational tennis, this tournament applies the following eligibility and participation restriction rules.",
    groups: [
      {
        label: "Restriction for former elite players",
        items: [
          "Participants who were previously registered as elite players with an official organization may only enter the Open Division, regardless of their partner's level.",
        ],
      },
      {
        label: "Participation restrictions for past tournament winners",
        content:
          "Past winners of this tournament must follow the general rules below. However, specific exception criteria apply if certain conditions are met.",
        groups: [
          {
            label: "General rule (mandatory level-up)",
            items: [
              "Past winners of this tournament must enter a division at least one level higher than the division they previously won.",
              "Example: A past winner of Bronze Doubles may only enter Silver Doubles or a higher division in this tournament.",
            ],
          },
          {
            label: "Exception criteria (conditions for same-level entry)",
            content:
              "If no higher-level event is available and the participant must enter the same division, all of the restrictions below must be followed.",
            groups: [
              {
                label: "Exception for Gold Division winners",
                items: [
                  "Gold Division winners may enter the Gold Division again, even if the higher Open Division is available.",
                ],
              },
              {
                label: "Partner change requirement",
                items: [
                  "Past winners may not enter again with the same partner they won with previously. They must change partners.",
                ],
              },
              {
                label: "Separate application by event type",
                items: [
                  "These restrictions apply separately to singles, doubles, and mixed doubles groups.",
                  "Example: A player who previously won Silver Singles may still enter Silver Doubles if their doubles level is considered Silver.",
                ],
              },
              {
                label: "Exception for winners with partners from different levels",
                items: [
                  "If the partners had a level gap of two or more levels at the time of their previous win, only the lower-level player may enter the same division again.",
                  "Example: If a Gold-level player and a Bronze-level player won the Silver Division together:",
                ],
                subItems: [
                  "Bronze-level player: may re-enter the Silver Division.",
                  "Gold-level player: may not enter the Silver Division again, even with a different Bronze-level partner. Must move up to a higher division.",
                ],
              },
            ],
          },
        ],
      },
      {
        label: "Administrative matters and penalties",
        items: [
          "Any matters not clearly stated in these rules will be interpreted and decided by the tournament organizing committee.",
          "If a participant is found to have entered a lower division that does not match their actual skill level, the organizing committee may change their division or disqualify them.",
          "If a participant is disqualified, the tournament registration fee will not be refunded.",
        ],
      },
    ],
  },
  ko: {
    label: "참가 자격 및 출전 제한 규정",
    content:
      "본 대회는 참가 선수 간의 공정한 경쟁과 동호인 테니스 발전을 위해 아래와 같이 참가 자격 및 출전 제한 규정을 적용합니다.",
    groups: [
      {
        label: "선수 출신 참가 제한",
        items: [
          "공식 기관에 등록되었던 엘리트 선수 출신 참가자는 파트너의 등급과 관계없이 오픈부로만 출전할 수 있습니다.",
        ],
      },
      {
        label: "본 대회 역대 우승자 출전 제한",
        content:
          "과거 본 대회에서 우승한 경력이 있는 참가자는 아래의 일반 기준을 따르되, 특정 조건 충족 시 예외 기준을 적용합니다.",
        groups: [
          {
            label: "일반 기준 (등급 상향 출전)",
            items: [
              "과거 본 대회 우승자는 당시 우승했던 등급보다 최소 한 단계 이상 상향된 등급으로만 출전할 수 있습니다.",
              "예시: 과거 '동배 복식' 우승자는 본 대회에 '은배 복식' 이상 등급으로만 출전할 수 있습니다.",
            ],
          },
          {
            label: "예외 기준 (동일 등급 출전 허용 조건)",
            content:
              "우승자가 당시 등급보다 상향된 등급의 세부 종목이 개설되지 않아 부득이하게 동일 등급으로 출전해야 할 경우, 다음의 제한 사항을 모두 준수해야 합니다.",
            groups: [
              {
                label: "금배부 우승자에 대한 예외",
                items: [
                  "금배부 우승자의 경우, 상위 등급인 오픈부 경기가 개설되더라도 과거 우승했던 금배부 등급으로 동일하게 출전할 수 있습니다.",
                ],
              },
              {
                label: "파트너 교체 의무",
                items: [
                  "과거 우승 당시의 파트너와는 동일한 조합으로 다시 출전할 수 없으며, 반드시 파트너를 변경해야 합니다.",
                ],
              },
              {
                label: "종목별 개별 적용",
                items: [
                  "본 제한 규정은 단식, 복식, 혼합복식 각 그룹에 개별 적용됩니다.",
                  "예시: '은배 단식' 우승 경력이 있더라도, 복식 등급이 은배 수준인 경우 '은배 복식'으로의 출전은 허용됩니다.",
                ],
              },
              {
                label: "상이한 등급 파트너와의 우승에 대한 예외",
                items: [
                  "과거 우승 당시 파트너 간의 등급 차이가 2단계 이상이었을 경우, 하위 등급 선수에 한해 동일 등급 출전을 허용합니다.",
                  "예시: 과거 '금배' 선수와 '동배' 선수가 조를 이루어 '은배부'에서 우승한 경우",
                ],
                subItems: [
                  "동배 선수: 본 대회 '은배부'로 동일 등급 재출전 가능",
                  "금배 선수: 다른 동배 선수를 파트너로 영입하더라도 '은배부' 출전 불가 (상향 출전 필수)",
                ],
              },
            ],
          },
        ],
      },
      {
        label: "기타 행정 사항 및 불이익 조치",
        items: [
          "본 규정에 명시되지 않은 사항은 대회 조직위원회의 유권해석 및 결정에 따릅니다.",
          "본인의 실제 실력 및 등급과 상이한 등급으로 하향 출전한 사실이 확인될 경우, 대회 조직위원회의 결정에 따라 등급이 변경되거나 실격 처리될 수 있습니다.",
          "실격 처리되는 경우, 대회 등록비는 환불되지 않습니다.",
        ],
      },
    ],
  },
};

const year = getYear();
const regEntry = getImportantDates(year).find((e) => e.label === "Registration");

function localDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

const regStartEn = regEntry && regEntry.type === "range"
  ? localDate(regEntry.startDate).toLocaleDateString("en-CA", { month: "long", day: "numeric", year: "numeric" })
  : "";
const regStartKo = regEntry && regEntry.type === "range"
  ? localDate(regEntry.startDate).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })
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
      closedTitle: `${year} Registration has closed`,
      closedMessage: `The registration period (${regPeriodEn}) has ended.`,
      step1Title: "Registration details",
      step2Title: "Eligibility notice",
      giveawayLabel: "Giveaway",
      giveawayValue: "Tumbler (one per player)",
      returningRegistrantButton: "Returning registrant?",
      newRegistrationButton: "Register",
      lookupTitle: "Your Registration",
      lookupEmailPlaceholder: "Enter your registered email",
      lookupButton: "Look up",
      lookingUpButton: "Looking up...",
      lookupNoResult: "No registration found for this email.",
      lookupError: "Lookup failed. Please try again.",
      editButton: "Edit",
      cancelButton: "Cancel",

      saveButton: "Save changes",
      savingButton: "Saving...",
      cancelEditButton: "Back",
      confirmationTitle: "Registration complete!",
      confirmationBody: "Your registration has been received. Join our KakaoTalk open chat to get the tournament information",
      confirmationAdminBody: "Registration created for {name}.",
      confirmationButton: "Open KakaoTalk Chat",
      confirmationClose: "Close",
      confirmationManage: "Manage registration",
    },
    registrationForm: {
      sections: {
        playerDetails: "Player details",
        tournamentDetails: "Tournament details",
        paymentDetails: "Payment details",
        additionalDetails: "Additional details",
      },
      fields: {
        categories: "Category",
        searchCategoriesPlaceholder: "Select categories",
        searchClubsPlaceholder: "Select clubs",
        partnerName: "Partner name",
        nameOnEtransfer: "Name on e-Transfer",
        notes: "Notes",
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
      closedTitle: `${year}년 등록이 마감되었습니다`,
      closedMessage: `등록 기간(${regPeriodKo})이 종료되었습니다.`,
      step1Title: "등록 정보",
      step2Title: "참가 자격",
      giveawayLabel: "기념품",
      giveawayValue: "텀블러 (1인 1개)",
      returningRegistrantButton: "이미 등록하셨나요?",
      newRegistrationButton: "등록하기",
      lookupTitle: "등록 내역",
      lookupEmailPlaceholder: "등록한 이메일을 입력하세요",
      lookupButton: "조회",
      lookingUpButton: "조회 중...",
      lookupNoResult: "이 이메일로 등록된 내역이 없습니다.",
      lookupError: "조회에 실패했습니다. 다시 시도해 주세요.",
      editButton: "수정",
      cancelButton: "취소",

      saveButton: "변경 저장",
      savingButton: "저장 중...",
      cancelEditButton: "뒤로",
      confirmationTitle: "등록 완료",
      confirmationBody: "등록이 접수되었습니다. 대회 정보는 카카오 오픈채팅을 통해 공유됩니다.",
      confirmationAdminBody: "{name} 등록이 완료되었습니다.",
      confirmationButton: "오픈채팅 가입하기",
      confirmationClose: "닫기",
      confirmationManage: "등록 관리",
    },
    registrationForm: {
      sections: {
        playerDetails: "개인 정보",
        tournamentDetails: "대회 정보",
        additionalDetails: "추가 정보",
        paymentDetails: "결제 정보",
      },
      fields: {
        categories: "카테고리",
        searchCategoriesPlaceholder: "카테고리 선택",
        searchClubsPlaceholder: "클럽 검색",
        partnerName: "파트너 이름",
        nameOnEtransfer: "이체 시 이름",
        notes: "메모",
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
        total: "총",
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
      email: contactData.email.link,
    },
  },
} as const;
