import { EXTERNAL_LINKS } from "@/lib/externalLinks";
import { importantDates } from "@/lib/importantDatesData";

const _finalEntry = importantDates.find((e) => e.label === "Final");
const finalDateEn =
  (_finalEntry && _finalEntry.type !== "text" ? _finalEntry.valueDisplay : null) ?? "TBD";
const finalDateKo =
  (_finalEntry && _finalEntry.type !== "text" ? _finalEntry.valueDisplayKo : null) ?? "추후 확정";

/** Rules page content (EN + KO), modeled after other lib/content page modules. */
export const rulesPage = {
  en: {
    rulesPage: {
      heroTitle: "Rules",
      sectionTitles: {
        matchGuidelines: "Match guidelines",
        localRules: "Local rules",
        scoringFormat: "Match format and regulations",
        matchSchedulingCourtAvailability: "Match scheduling and court availability",
        walkoversRetirements: "Walkovers and retirements",
      },
      formatAndScoring: {
        title: "Match format and regulations",
        table: [
          {
            label: "Match format",
            items: [
              "All matches will be played as best-of-three sets.",
              "Sets 1 and 2: Regular sets (first to 6 games, including tiebreaks).",
              "Set 3: Super tiebreak (first to 10 points, win by 2 points).",
              "At 5-5, a tiebreak will be played.",
            ],
          },
          {
            label: "Deuce & No-Ad rules",
            items: [
              "In a deuce situation, the No-Ad (No Advantage) rule applies after the first deuce. For the deciding point, the receiving team chooses the receiver.",
              "At set point and match point, the No-Ad rule is not used - play continues using the traditional deuce format.",
              "In mixed doubles, the receiver must be the same gender as the server (i.e., male vs. male / female vs. female) during No-Ad points.",
            ],
          },
          {
            label: "Retirement & disqualification policy",
            items: [
              "If a team retires during a match, all remaining games will be considered a loss for that team.",
              "Example: If Team A retires when the score is 4-2 in the first set, the final score will be recorded as 6-4, 6-0 in favor of Team B.",
              "Matches played against a disqualified team will be considered null and void.",
            ],
          },
          {
            label: "Cheering etiquette",
            items: [
              "Since many players are members of social clubs, active cheering is expected.",
              "All cheering must reflect respectful sportsmanship.",
              "Non-players (including spectators and umpires) are strictly prohibited from making line calls or interfering with play.",
              "Inappropriate behaviour, heckling or excessive noise that disrupts focus is not allowed.",
            ],
          },
        ],
      },
      rules: {
        title: "Rules",
        intro:
          "This tournament is founded on the principles of fair play and sportsmanship. To ensure smooth and fair operations, the following local rules apply. All participants are expected to understand and follow these guidelines.",
        table: [
          {
            label: "Self-call and officiating",
            items: [
              "This tournament follows the principle of self-call as the default.",
              "Players are responsible for making line calls on balls that land on their side of the court.",
              "Calls must be made using clear judgment and in the spirit of sportsmanship.",
              "Respect your opponent's calls, even if you disagree.",
              "In unclear situations, give the benefit of the doubt to the opponent.",
              "If both teams agree, a third person may act as an umpire, but the self-call principle still applies.",
              "If an official umpire is assigned, their decision is final.",
            ],
          },
          {
            label: "Call reversal",
            items: [
              "If a call is reversed and it did not interfere with the opponent's play, the point continues based on the corrected call.",
              "If the reversal affected the opponent's play, the point is replayed as a let.",
            ],
          },
          {
            label: "Late calls",
            items: [
              "Line calls must be made immediately after the ball bounces.",
              "Calls made after the ball has exited the court are considered late calls and are invalid.",
            ],
          },
          {
            label: "Interference",
            items: [
              "Calling out before the opponent hits the ball is considered interference and may result in the point being awarded to the opponent.",
              "Calls made before you or your partner hits the ball are permitted.",
            ],
          },
          {
            label: "Foot faults",
            items: [
              "During serve, your feet must not touch or cross the baseline.",
              "Foot faults are a common issue in amateur matches and should be monitored carefully.",
              "If you suspect your opponent is committing foot faults, you may request an official to make a judgment.",
            ],
          },
          {
            label: "Service interruptions",
            items: [
              "If play is interrupted by an outside factor, such as a ball from another court, the point is restarted with a first serve.",
              "This applies regardless of whether the interruption occurred during the first or second serve.",
            ],
          },
          {
            label: "Score calling",
            items: [
              "The server must clearly call the score before each point begins.",
              "Before serving, clearly announce the score to avoid confusion about the score or court changes.",
              "If there is a dispute due to a missing score call, the receiver's version takes precedence.",
              "If the score was called clearly, the server's version is accepted.",
            ],
          },
          {
            label: "Order errors",
            items: [
              "If there is an error in the order of server and receiver, or if a required court change is missed, it must be corrected immediately upon recognition.",
              "Points played before the error remain valid.",
              "The match continues normally according to the established rules.",
            ],
          },
          {
            label: "Conduct and dispute resolution",
            items: [
              "All players must maintain a respectful attitude toward opponents at all times.",
              "Avoid language or actions that could cause discomfort or unfairness.",
              "The tournament committee will resolve all disputes during matches.",
              "All participants agree to accept the committee's final decision.",
            ],
          },
        ],
      },
      officialBall: {
        title: "Official ball",
        table: [
          {
            label: "",
            items: [
              "The official ball is the Pro Penn tennis ball.",
              "Teams that bring their own balls are expected to use them first; the organizing committee will provide balls afterward for the match.",
              "If balls are not available, please contact the organizing committee in advance to receive them before the match.",
            ],
          },
        ],
      },
      preliminaryMatches: {
        title: "Preliminary matches",
        table: [
          {
            label: "",
            items: [
              "All preliminary matches must be completed by Saturday, August 16.",
              "The schedule and location for each match should be arranged mutually between the teams.",
              "If scheduling is difficult, teams may request assistance from the organizing committee.",
            ],
          },
        ],
      },
      finalistsSelection: {
        title: "Finalists selection process",
        table: [
          {
            label: "",
            items: [
              "The preliminary format will be either a full round-robin or a group round-robin, depending on the number of participants. The number of teams advancing to the finals will be determined accordingly.",
              "The final format will be announced after registration is complete.",
              "Teams advancing to the finals will be determined based on the following priority criteria:",
              "Win percentage",
              "Overall set difference",
              "Set difference among tied teams",
              "Overall game difference",
              "Game difference among tied teams",
              "Super tiebreak difference (if there is no record of a super tiebreak, it is counted as 0)",
              "Drawing of lots (if still tied)",
            ],
          },
        ],
      },
      preliminariesCourt: {
        title: "Venue",
        preliminariesHeading: "Preliminaries courts",
        finalHeading: "Final",
        description:
          "Preliminaries match location and time can be arranged by the teams. We offer courts for preliminary matches during the preliminaries period, subject to availability on a first come, first served basis. Players must notify the admin in advance to confirm the schedule.",
        finals: {
          location: "Gates Park Tennis Courts",
          time: "TBD",
          dateDisplay: finalDateEn,
        },
        prelimHeaders: ["Location", "Date", "Day", "Time"],
        prelimRows: [
          {
            location: "Fraser Heights Court 1, 2",
            href: EXTERNAL_LINKS.fraserHeightsCourt12,
            date: "June 27 – Aug 18",
            day: "Tuesday",
            time: "7:00 PM – 9:00 PM",
          },
          {
            location: "Fraser Heights Court North",
            href: EXTERNAL_LINKS.fraserHeightsCourtNorth,
            date: "June 27 – Aug 16",
            day: "Sunday",
            time: "5:00 PM – 7:00 PM",
          },
          {
            location: "Gates Park Tennis Courts",
            href: EXTERNAL_LINKS.gatesParkTennisCourts,
            locationNote: "(Court number TBD)",
            date: "June 27 – Aug 16",
            day: "Sunday",
            time: "5:00 PM – 7:00 PM",
          },
        ],
      },
      resultsSection: {
        title: "Results",
        reportingResultsLabel: "Reporting results",
        reportingResultsPrefix: "After each match, the winning team must share the results in the ",
        reportingResultsLinkLabel: "KakaoTalk Open Chat room",
        reportingResultsSuffix: " using the format below:",
        reportingResultsExample: "Example: Federer/Jokovic 6-3, 1-6, 10-3 Murray/Nadal",
        viewingResultsLabel: "Viewing results",
        viewingResultsPrefix:
          "All match results can be viewed on the Results page and information will be regularly shared in the ",
        viewingResultsLinkLabel: "KakaoTalk Open Chat room",
        viewingResultsSuffix: ".",
      },
    },
  },
  ko: {
    rulesPage: {
      heroTitle: "규칙",
      sectionTitles: {
        matchGuidelines: "경기 운영 지침",
        localRules: "동호인 대회 로컬 룰 안내",
        scoringFormat: "경기 형식 및 규정",
        matchSchedulingCourtAvailability: "경기 일정 및 코트 이용 안내",
        walkoversRetirements: "기권/실격 관련 규정",
      },
      formatAndScoring: {
        title: "경기 형식 및 규정",
        table: [
          {
            label: "경기 형식",
            items: [
              "모든 경기는 3세트 매치로 진행됩니다.",
              "1세트 및 2세트: 일반 세트 진행 (6게임 선취, 타이브레이크 포함)",
              "3세트: 슈퍼 타이브레이크 (10포인트 선취, 2점 차 승리)",
              "5-5에서 타이브레이크로 진행합니다.",
            ],
          },
          {
            label: "듀스 및 노애드 규정",
            items: [
              "듀스 상황에서는 첫 번째 듀스 이후 노애드(No-Ad, 노 어드밴티지) 방식으로 진행되며, 결정 포인트에서는 리시빙 팀이 리시버를 선택합니다.",
              "단, 세트 포인트 및 매치 포인트 상황에서는 노애드 룰이 적용되지 않고, 기존 듀스 방식으로 계속 진행됩니다.",
              "혼합복식 경기에서는 노애드 상황에서 서버와 동일한 성별의 선수가 리시버로 나서야 합니다 (예: 남자 vs 남자 / 여자 vs 여자).",
            ],
          },
          {
            label: "기권/실격 관련 규정",
            items: [
              "경기 도중 기권 시, 진행된 경기 이후는 모두 패한 것으로 간주합니다.",
              "예시: 1세트 4-2 상황에서 A팀이 기권하면 최종 스코어는 6-4, 6-0으로 B팀 승리로 처리합니다.",
              "실격된 팀과 치른 경기는 모두 무효로 처리됩니다.",
            ],
          },
          {
            label: "응원 매너 및 관중 에티켓",
            items: [
              "동호회 소속 선수들이 참여하는 경기 특성상, 응원이 활발할 것으로 예상됩니다.",
              "모든 응원은 스포츠맨십에 입각한 건전한 응원 문화를 지향해야 합니다.",
              "선수 외의 인원(심판 포함)은 라인 판정 및 경기 개입을 엄격히 금지합니다.",
              "부적절한 언행, 상대 팀에 대한 비방, 경기 집중을 방해하는 소음 등은 지양하여 주시기 바랍니다.",
            ],
          },
        ],
      },
      rules: {
        title: "규칙",
        intro:
          "본 대회는 참가자 간의 페어플레이 정신과 스포츠맨십을 바탕으로 진행되며, 다음과 같은 로컬 룰을 적용합니다. 참가자 여러분께서는 원활하고 공정한 경기 운영을 위하여 아래 사항을 숙지하시고 협조하여 주시기 바랍니다.",
        table: [
          {
            label: "셀프콜 (Self-call) 및 심판",
            items: [
              "본 대회는 셀프콜(Self-call) 원칙을 기본으로 합니다. 모든 선수는 자신의 코트에 떨어진 공에 대해 스스로 정확하고 정직하게 판정해야 합니다.",
              "양 팀이 합의할 경우, 제3자를 심판으로 둘 수 있습니다. 이 경우에도 셀프콜 원칙은 유지됩니다.",
              "심판이 배정된 경우, 최종 판정은 심판의 판단을 따릅니다.",
              "판정이 불명확할 경우, 상대팀에 유리하게 콜해주시는 것이 스포츠맨십에 부합합니다.",
              "상대의 셀프콜은 존중해 주시기 바랍니다.",
            ],
          },
          {
            label: "콜 번복",
            items: [
              "공의 인/아웃 판정이 번복된 경우, 해당 콜로 인해 상대방의 플레이에 방해가 없었다면 해당 판정에 따라 경기를 계속 진행합니다.",
              "콜 번복이 상대의 플레이에 영향을 미친 경우, 해당 포인트는 렛(let) 으로 처리하여 포인트를 다시 시작합니다.",
            ],
          },
          {
            label: "레이트 콜",
            items: [
              "공이 코트에 바운드된 직후 즉시 인/아웃 여부를 판정해야 하며, 공이 이미 자신의 코트를 벗어난 뒤에 이루어진 콜은 레이트 콜로 간주되어 무효 처리됩니다.",
            ],
          },
          {
            label: "방해 행위",
            items: [
              "상대방이 공을 치기 전에 인/아웃 콜을 외치는 행위는 플레이 방해 행위로 간주되며, 해당 포인트는 상대팀에 유리하게 판정될 수 있습니다.",
              "반면, 자신 또는 파트너가 공을 치기 전에 외치는 콜은 허용됩니다.",
            ],
          },
          {
            label: "풋폴트",
            items: [
              "풋폴트는 동호인 경기에서도 자주 발생하는 반칙 중 하나입니다. 서브 시 베이스라인을 밟거나 넘지 않도록 주의해 주시고, 반복적인 풋폴트가 발생하지 않도록 스스로 유념해 주시기 바랍니다.",
              "상대방의 풋폴트가 의심될 경우, 심판 요청을 통해 판정을 받을 수 있습니다.",
            ],
          },
          {
            label: "서비스 방해",
            items: [
              "경기 중 옆 코트에서 공이 넘어오거나 외부 요인으로 인해 플레이가 중단된 경우, 해당 포인트는 첫 번째 서비스부터 다시 시작합니다. 이는 첫 서브 도중 경기 중단된 경우에도 동일하게 적용됩니다.",
            ],
          },
          {
            label: "스코어 콜",
            items: [
              "서버는 매 포인트 시작 전 반드시 스코어를 명확히 선언해야 합니다.",
              "스코어 콜이 누락되어 스코어에 대한 논쟁이 발생할 경우, 리시버의 기억에 따라 스코어를 인정합니다.",
              "스코어가 정상적으로 선언된 경우에는, 서버의 기억에 따라 스코어를 확정합니다.",
              "서브 전에 점수를 명확히 상대팀에 알리고 서브를 진행해 주시기 바랍니다. 이로 인해 점수나 코트 변경에 혼선이 생기지 않도록 주의해 주시기 바랍니다.",
            ],
          },
          {
            label: "순서 착오",
            items: [
              "서버 및 리시버의 순서 착오, 또는 규정에 따른 코트 체인지 누락이 발생한 경우, 해당 사실을 인지한 즉시 정정해야 합니다.",
              "착오 이전에 진행된 포인트는 그대로 유효하며, 이후 경기는 정해진 규정에 따라 정상적으로 이어집니다.",
            ],
          },
          {
            label: "추가 유의 사항",
            items: [
              "선수들은 항상 상대 팀에 대한 존중의 태도를 유지해야 하며, 상대방에게 불쾌감이나 불이익을 줄 수 있는 언행은 삼가 주시기 바랍니다.",
              "모든 참가자는 스포츠맨십에 입각하여 경쟁과 예의를 조화롭게 유지해 주시기 바랍니다",
              "경기 중 발생하는 모든 분쟁은 대회 운영위원회의 판단에 따라 최종 결정되며, 이에 모든 참가자는 이의를 제기하지 않기로 합니다.",
              "로컬 룰은 대회의 질서 있고 공정한 운영을 위한 최소한의 규칙이기에 참가자 여러분의 성숙한 자세와 자발적인 참여를 다시 한 번 부탁드립니다.",
            ],
          },
        ],
      },
      officialBall: {
        title: "공식 구",
        table: [
          {
            label: "",
            items: [
              "공식 구는 Pro Penn 테니스 볼입니다.",
              "자체 구를 가져온 팀은 해당 구를 먼저 사용하고, 이후 경기용 구는 운영위원회에서 제공합니다.",
              "공이 준비되지 않은 경우에는 경기 전 미리 운영위원회에 연락하여 공을 수령하시기 바랍니다.",
            ],
          },
        ],
      },
      preliminaryMatches: {
        title: "예선 경기",
        table: [
          {
            label: "",
            items: [
              "모든 예선 경기는 8월 16일 토요일까지 완료되어야 합니다.",
              "경기 일정과 장소는 양 팀이 상호 협의하여 정합니다.",
              "일정 조율이 어려울 경우 운영위원회에 도움을 요청할 수 있습니다.",
            ],
          },
        ],
      },
      finalistsSelection: {
        title: "본선 진출 팀 선정",
        table: [
          {
            label: "",
            items: [
              "예선 방식은 참가 인원 수에 따라 풀리그 또는 조별 리그로 운영되며, 본선 진출 팀 수도 이에 따라 달라집니다.",
              "참가 접수 완료 후, 최종 방식을 공지합니다.",
              "본선 진출 팀은 아래 우선순위 기준에 따라 결정됩니다.",
              "승률",
              "전체 세트 득실차",
              "동률 팀 간 세트 득실차",
              "전체 게임 득실차",
              "동률 팀 간 게임 득실차",
              "슈퍼 타이브레이크 득실차 (단, 슈퍼 타이브레이크 기록이 없는 경우 0으로 계산함)",
              "추첨",
            ],
          },
        ],
      },
      preliminariesCourt: {
        title: "장소",
        preliminariesHeading: "예선 코트",
        finalHeading: "본선",
        description:
          "예선 기간 동안 예선 경기의 장소와 시간은 팀 간 협의로 조정할 수 있습니다. 예선 경기용 코트는 선착순으로 제공되며, 이용을 원하시면 사전에 운영진에게 연락해 일정을 확정해 주세요.",
        finals: {
          location: "게이츠 파크 테니스 코트",
          time: "추후 확정",
          dateDisplay: finalDateKo,
        },
        prelimHeaders: ["장소", "날짜", "요일", "시간"],
        prelimRows: [
          {
            location: "Fraser Heights Court 1, 2",
            href: EXTERNAL_LINKS.fraserHeightsCourt12,
            date: "6월 27일 – 8월 18일",
            day: "화요일",
            time: "오후 7:00 – 9:00",
          },
          {
            location: "Fraser Heights Court North",
            href: EXTERNAL_LINKS.fraserHeightsCourtNorth,
            date: "6월 27일 – 8월 16일",
            day: "일요일",
            time: "오후 5:00 – 7:00",
          },
          {
            location: "Gates Park Tennis Courts",
            href: EXTERNAL_LINKS.gatesParkTennisCourts,
            locationNote: "(코트 번호 추후 공지)",
            date: "6월 27일 – 8월 16일",
            day: "일요일",
            time: "오후 5:00 – 7:00",
          },
        ],
      },
      resultsSection: {
        title: "결과",
        reportingResultsLabel: "경기 결과 제출",
        reportingResultsPrefix: "경기 후 승리 팀은 ",
        reportingResultsLinkLabel: "카카오톡 오픈채팅방",
        reportingResultsSuffix: "에 아래 형식으로 결과를 공유해 주세요.",
        reportingResultsExample: "예: 페더러/조코비치 6-3, 1-6, 10-3 머레이/나달",
        viewingResultsLabel: "결과 확인",
        viewingResultsPrefix: "모든 경기 결과는 결과 페이지에서 확인할 수 있으며, ",
        viewingResultsLinkLabel: "카카오톡 오픈채팅방",
        viewingResultsSuffix: "을 통해 수시로 안내됩니다.",
      },
    },
  },
} as const;
