/** Rules page content (EN + KO), modeled after other lib/content page modules. */
export const rulesPage = {
  en: {
    rulesPage: {
      heroTitle: "Rules",
      sectionTitles: {
        matchGuidelines: "Match guidelines",
        matchRules: "Local rules",
      },
      matchGuidelines: {
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
              "At set point and match point, the No-Ad rule is not used — play continues using the traditional deuce format.",
              "In mixed doubles, the receiver must be the same gender as the server (i.e., male vs. male / female vs. female) during No-Ad points.",
            ],
          },
        ],
      },
      matchRules: {
        intro:
          "This tournament is founded on the principles of fair play and sportsmanship. To ensure smooth and fair operations, the following local rules apply. All participants are expected to understand and follow these guidelines.",
        table: [
          {
            label: "Self-call and officiating",
            items: [
              "This tournament follows the principle of self-call as the default. All players are responsible for making accurate and honest calls for balls that land on their side of the court.",
              "If both teams agree, a third person may act as an umpire. The self-call principle still applies in this case.",
              "If an official umpire is assigned, their decision is final.",
              "In unclear situations, giving the call to the opponent is in the spirit of sportsmanship.",
              "Please respect your opponent's calls.",
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
              "Line calls must be made immediately after the ball bounces. Calls made after the ball has exited the court are considered late calls and are invalid.",
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
              "Foot faults are a common occurrence in amateur matches. During serve, be careful not to touch or cross the baseline, and be mindful not to commit repeated foot faults.",
              "If you suspect your opponent is committing foot faults, you may request an official to make a judgment.",
            ],
          },
          {
            label: "Service interruptions",
            items: [
              "If play is interrupted by an outside factor such as a ball from another court, the point is restarted with a first serve. This applies regardless of whether the interruption occurred during the first or second serve.",
            ],
          },
          {
            label: "Score calling",
            items: [
              "The server must clearly call the score before each point begins.",
              "If there is a dispute due to a missing score call, the receiver's version takes precedence.",
              "If the score was called clearly, the server's version is accepted.",
              "Before serving, clearly announce the score to the opposing team to avoid any confusion about the score or court changes.",
            ],
          },
          {
            label: "Order errors",
            items: [
              "If there is an error in the order of server and receiver, or if a required court change is missed, it must be corrected immediately upon recognition.",
              "Points played before the error remain valid, and the match continues normally according to the established rules.",
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
              "Non-players, including spectators and umpires, are strictly prohibited from making line calls or interfering with play.",
              "Inappropriate behaviour, disparaging the opposing team, or excessive noise that disrupts focus is not allowed.",
            ],
          },
          {
            label: "Additional notes",
            items: [
              "All players must maintain a respectful attitude toward opponents at all times, and refrain from language or actions that could cause discomfort or disadvantage.",
              "All participants are asked to balance competition and courtesy in the spirit of sportsmanship.",
              "All disputes during matches will be resolved by the tournament organizing committee, and all participants agree not to contest the committee's final decision.",
              "As the local rules represent the minimum guidelines for orderly and fair tournament operations, we once again ask for your mature attitude and willing cooperation.",
            ],
          },
        ],
      },
    },
  },
  ko: {
    rulesPage: {
      heroTitle: "규칙",
      sectionTitles: {
        matchGuidelines: "경기 가이드라인",
        matchRules: "동호인 대회 로컬 룰 안내",
      },
      matchGuidelines: {
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
              "혼합복식 경기에서는 노애드 상황에서 서버와 동일한 성별의 선수가 리시버로 나서야 합니다. 예: 남자 vs. 남자 / 여자 vs. 여자",
            ],
          },
        ],
      },
      matchRules: {
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
          {
            label: "추가 유의 사항",
            items: [
              "선수들은 항상 상대 팀에 대한 존중의 태도를 유지해야 하며, 상대방에게 불쾌감이나 불이익을 줄 수 있는 언행은 삼가 주시기 바랍니다.",
              "모든 참가자는 스포츠맨십에 입각하여 경쟁과 예의를 조화롭게 유지해 주시기 바랍니다.",
              "경기 중 발생하는 모든 분쟁은 대회 운영위원회의 판단에 따라 최종 결정되며, 이에 모든 참가자는 이의를 제기하지 않기로 합니다.",
              "로컬 룰은 대회의 질서 있고 공정한 운영을 위한 최소한의 규칙이기에 참가자 여러분의 성숙한 자세와 자발적인 참여를 다시 한 번 부탁드립니다.",
            ],
          },
        ],
      },
    },
  },
} as const;
