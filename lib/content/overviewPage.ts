import { getImportantDates } from "@/lib/importantDatesData";
import { getYear } from "@/lib/utils";
import { EXTERNAL_LINKS } from "@/lib/externalLinks";
import { contactData } from "@/lib/contactData";
import { VENUES } from "@/lib/content/courts";
import { formatDateDisplay } from "@/lib/matches";

// Jan 2 2000 was a Sunday; offset by dayOfWeek to get the right weekday
function weekdayLabel(dayOfWeek: number, locale: "en" | "ko"): string {
  const d = new Date(2000, 0, 2 + dayOfWeek);
  const name = d.toLocaleDateString(locale === "ko" ? "ko-KR" : "en-US", { weekday: "long" });
  return locale === "ko" ? `매주 ${name}` : `${name}s`;
}

function venuePrelimRow(v: typeof VENUES[number], locale: "en" | "ko") {
  // Gates Park name already ends with "Courts" — no extra "Court" word needed
  const courtSuffix = v.id === "gates-park"
    ? ` ${v.courts.join(", ")}`
    : ` Court ${v.courts.join(", ")}`;
  return {
    location: v.name + courtSuffix,
    href: v.href,
    date: `${formatDateDisplay(v.startDate, locale)} – ${formatDateDisplay(v.endDate, locale)}`,
    day: weekdayLabel(v.dayOfWeek, locale),
    time: v.timeSlot,
  };
}

const _finalEntry = getImportantDates(getYear()).find((e) => e.label === "Final");
const finalDateEn =
  (_finalEntry && _finalEntry.type !== "text" ? _finalEntry.valueDisplay : null) ?? "TBD";
const finalDateKo =
  (_finalEntry && _finalEntry.type !== "text" ? _finalEntry.valueDisplayKo : null) ?? "추후 확정";

const regEntry = getImportantDates(getYear()).find((e) => e.label === "Registration");
const regPeriodEn = regEntry && regEntry.type !== "text" ? regEntry.valueDisplay : "";
const regPeriodKo = regEntry && regEntry.type !== "text" ? (regEntry.valueDisplayKo ?? regEntry.valueDisplay) : "";

const _prelimEntry = getImportantDates(getYear()).find((e) => e.label === "Preliminaries");
const _prelimEndStr = _prelimEntry?.type === "range" ? _prelimEntry.endDate : null;
const _prelimEndDate = _prelimEndStr ? new Date(`${_prelimEndStr}T12:00:00`) : null;
const prelimEndEn = _prelimEndStr ? formatDateDisplay(_prelimEndStr, "en") : "TBD";
const prelimEndKo = _prelimEndStr ? formatDateDisplay(_prelimEndStr, "ko") : "TBD";
const prelimEndWeekdayEn = _prelimEndDate ? _prelimEndDate.toLocaleDateString("en-US", { weekday: "long" }) : "";
const prelimEndWeekdayKo = _prelimEndDate ? _prelimEndDate.toLocaleDateString("ko-KR", { weekday: "long" }) : "";

const _tournamentEntry = getImportantDates(getYear()).find((e) => e.label === "Tournament");
const tournamentYear = _tournamentEntry?.type === "range" ? _tournamentEntry.startDate.slice(0, 4) : String(new Date().getFullYear());

export const overviewPage = {
  en: {
    overviewPage: {
      heroTitle: "Overview",
      overview: {
        id: "about",
        title: "About",
        hostSponsorLookupName: "Tom Lee Sedation Dental Group",
        table: [
          { label: "Event", value: `Tomlee Open ${tournamentYear}` },
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
      importantDatesId: "important-dates",
      categories: {
        id: "categories",
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
      matchLogistics: {
        id: "match-logistics",
        title: "Match logistics",
        preliminaryMatches: {
          id: "preliminary-matches",
          title: "Preliminary matches",
          items: [
            `All preliminary matches must be completed by ${prelimEndWeekdayEn}, ${prelimEndEn}.`,
            "The schedule and location for each match should be arranged mutually between the teams.",
            "If scheduling is difficult, teams may request assistance from the organizing committee.",
          ],
        },
        officialBall: {
          id: "official-ball",
          title: "Official ball",
          items: [
            "The official ball is the Pro Penn tennis ball.",
            "Teams that bring their own balls are expected to use them first; the organizing committee will provide balls afterward for the match.",
            "If balls are not available, please contact the organizing committee in advance to receive them before the match.",
          ],
        },
        finalistsSelection: {
          id: "finalists-selection",
          title: "Finalists selection process",
          format: [
            "The preliminary format will be either a full round-robin or a group round-robin, depending on the number of participants. The number of teams advancing to the finals will be determined accordingly.",
            "The final format will be announced after registration is complete.",
          ],
          tiebreakers: {
            intro:
              "Teams advancing to the finals will be determined based on the following priority criteria:",
            items: [
              "Win percentage",
              "Overall set difference",
              "Set difference among tied teams",
              "Overall game difference",
              "Game difference among tied teams",
              "Super tiebreak difference; if there is no record of a super tiebreak, it is counted as 0.",
              "Drawing of lots, if still tied.",
            ],
          },
        },
      },
      venueAndCourts: {
        id: "venue-and-courts",
        title: "Venue",
        preliminariesHeading: "Preliminary",
        finalHeading: "Final",
        finals: {
          location: "Gates Park Tennis Courts",
          href: EXTERNAL_LINKS.gatesParkTennisCourts,
          day: "Saturday",
          time: "3:30 – 8:00 PM",
          dateDisplay: finalDateEn,
        },
        prelimHeaders: ["Location", "Date", "Day", "Time"],
        prelimRows: VENUES.map((v) => venuePrelimRow(v, "en")),
        venueTableHeading: "Preliminary Courts & Hours",
        bookCourtLabel: "Book a court",
        bookCourtHref: "/court-booking",
        courtBookingRules: {
          heading: "Court booking & cancellation policy",
          rows: [
            { label: "Booking limit", value: "One court booking per player per week." },
            {
              label: "Booking opens",
              value: "7 days before the usage date at midnight (00:00)",
              note: "Example: For courts on July 10, booking opens at midnight on July 3",
            },
            {
              label: "Cancellation",
              subitems: [
                "Cancellations must be made through the official KakaoTalk open chat.",
                "After cancellation is confirmed, admin will update the system and immediately announce 'Rebooking Available' in the open chat.",
                "Court bookings cannot be transferred between players. Please cancel the booking first, then make a new reservation through the booking page."
              ],
            },
          ] as Array<{ label: string; value?: string; note?: string; subitems?: readonly string[] }>,
        },
        penaltyTable: {
          heading: "Cancellation & no-show penalty policy",
          headers: ["Category", "Condition", "Penalty"],
          rows: [
            { category: "Normal cancellation", condition: "Cancelled 48+ hours before", penalties: ["No penalty"] },
            {
              category: "Late cancellation",
              condition: "Cancelled within 48 hours – 2 hours before",
              penalties: ["Future court booking ban"],
            },
            {
              category: "Urgent cancellation & No-show",
              condition: "Within 2 hours of start or unused",
              penalties: [
                "Future court booking ban",
                "$20 penalty fee",
                "Excluded from prize draw",
              ],
            },
          ] as Array<{ category: string; condition: string; penalties: string[] }>,
        },
      },
      resultReporting: {
        id: "result-reporting",
        title: "Results",
        reportingResults: {
          id: "reporting-results",
          label: "Reporting results",
          sentenceParts: [
            { text: "After each match, the winning team must share the results in the " },
            { linkLabel: contactData.kakao.label, href: contactData.kakao.href },
            { text: " using the format below:" },
          ],
          example: "Example: Federer/Jokovic 6-3, 1-6, 10-3 Murray/Nadal",
        },
        viewingResults: {
          id: "viewing-results",
          label: "Viewing results",
          sentenceParts: [
            { text: "All match results can be viewed on the Results page and information will be regularly shared in the " },
            { linkLabel: contactData.kakao.label, href: contactData.kakao.href },
            { text: "." },
          ],
        },
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
      inquiryKakaoPrefix: contactData.kakao.label,
      inquiryEmailPrefix: contactData.email.label,
    },
  },
  ko: {
    overviewPage: {
      heroTitle: "개요",
      overview: {
        id: "about",
        title: "대회 요강",
        hostSponsorLookupName: "Tom Lee Sedation Dental Group",
        table: [
          { label: "대회명", value: `탐리오픈 ${tournamentYear}` },
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
      importantDatesId: "important-dates",
      categories: {
        id: "categories",
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
      matchLogistics: {
        id: "match-logistics",
        title: "경기 운영 안내",
        preliminaryMatches: {
          id: "preliminary-matches",
          title: "예선 경기",
          items: [
            `모든 예선 경기는 ${prelimEndKo} ${prelimEndWeekdayKo}까지 완료되어야 합니다.`,
            "경기 일정과 장소는 양 팀이 상호 협의하여 정합니다.",
            "일정 조율이 어려울 경우 운영위원회에 도움을 요청할 수 있습니다.",
          ],
        },
        officialBall: {
          id: "official-ball",
          title: "공식 구",
          items: [
            "공식 구는 Pro Penn 테니스 볼입니다.",
            "자체 구를 가져온 팀은 해당 구를 먼저 사용하고, 이후 경기용 구는 운영위원회에서 제공합니다.",
            "공이 준비되지 않은 경우에는 경기 전 미리 운영위원회에 연락하여 공을 수령하시기 바랍니다.",
          ],
        },
        finalistsSelection: {
          id: "finalists-selection",
          title: "본선 진출 팀 선정",
          format: [
            "예선 방식은 참가 인원 수에 따라 풀리그 또는 조별 리그로 운영되며, 본선 진출 팀 수도 이에 따라 달라집니다.",
            "참가 접수 완료 후, 최종 방식을 공지합니다.",
          ],
          tiebreakers: {
            intro: "본선 진출 팀은 아래 우선순위 기준에 따라 결정됩니다.",
            items: [
              "승률",
              "전체 세트 득실차",
              "동률 팀 간 세트 득실차",
              "전체 게임 득실차",
              "동률 팀 간 게임 득실차",
              "슈퍼 타이브레이크 득실차. 단, 슈퍼 타이브레이크 기록이 없는 경우 0으로 계산함.",
              "추첨",
            ],
          },
        },
      },
      venueAndCourts: {
        id: "venue-and-courts",
        title: "장소",
        preliminariesHeading: "예선 코트",
        finalHeading: "본선 장소",
        finals: {
          location: "게이츠 파크 테니스 코트",
          href: EXTERNAL_LINKS.gatesParkTennisCourts,
          day: "토요일",
          time: "오후 3:30 – 8:00",
          dateDisplay: finalDateKo,
        },
        prelimHeaders: ["장소", "날짜", "요일", "시간"],
        prelimRows: VENUES.map((v) => venuePrelimRow(v, "ko")),
        venueTableHeading: "예선 코트 및 이용 시간",
        bookCourtLabel: "코트 예약",
        bookCourtHref: "/court-booking",
        courtBookingRules: {
          heading: "코트 예약 및 취소 규정",
          rows: [
            { label: "예약 제한", value: "선수 1인당 주 1회만 예약할 수 있습니다." },
            {
              label: "예약 오픈",
              value: "사용일 7일 전 00:00 (자정)부터 가능합니다",
              note: "예시: 7월 10일 코트 이용 희망 시, 7월 3일 0시부터 예약 가능",
            },
            {
              label: "예약 취소 절차",
              subitems: [
                "원활한 코트 재배정을 위해 취소는 반드시 공식 오픈채팅방을 통해 말씀해 주셔야 합니다.",
                "취소 접수 확인 후, 운영진이 웹사이트 시스템을 수정하여 오픈채팅방에 '재예약 가능' 상태를 즉시 공지할 예정입니다.",
                "선수 간 코트 예약 양도는 불가합니다. 기존 예약을 취소한 후, 예약 페이지를 통해 다시 예약해 주세요."
              ],
            },
          ] as Array<{ label: string; value?: string; note?: string; subitems?: readonly string[] }>,
        },
        penaltyTable: {
          heading: "잔여 시간별 취소 및 노쇼(No-Show) 페널티 안내",
          headers: ["구분", "적용 조건", "페널티 내용"],
          rows: [
            { category: "정상 취소", condition: "이용 시간 48시간 전까지 취소", penalties: ["페널티 없음"] },
            {
              category: "지각 취소",
              condition: "이용 시간 48시간 이내 ~ 2시간 전 취소",
              penalties: ["향후 대회 전용 코트 예약 불가"],
            },
            {
              category: "임박 취소 및 노쇼",
              condition: "이용 시간 2시간 이내 취소 또는 미사용",
              penalties: [
                "향후 전용 코트 예약 불가",
                "페널티 금액 $20 부과",
                "대회 경품 추첨 대상에서 제외",
              ],
            },
          ] as Array<{ category: string; condition: string; penalties: string[] }>,
        },
      },
      resultReporting: {
        id: "result-reporting",
        title: "결과",
        reportingResults: {
          id: "reporting-results",
          label: "경기 결과 제출",
          sentenceParts: [
            { text: "경기 후 승리 팀은 " },
            { linkLabel: "카카오톡 오픈채팅방", href: contactData.kakao.href },
            { text: "에 아래 형식으로 결과를 공유해 주세요." },
          ],
          example: "예: 페더러/조코비치 6-3, 1-6, 10-3 머레이/나달",
        },
        viewingResults: {
          id: "viewing-results",
          label: "결과 확인",
          sentenceParts: [
            { text: "모든 경기 결과는 결과 페이지에서 확인할 수 있으며, " },
            { linkLabel: "카카오톡 오픈채팅방", href: contactData.kakao.href },
            { text: "을 통해 수시로 안내됩니다." },
          ],
        },
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
