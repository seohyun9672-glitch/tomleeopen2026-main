export const adminPage = {
  en: {
    adminPage: {
      title: "Admin",
      tabs: {
        registrations: "Registrations",
        matches: "Matches",
        players: "Players",
        categories: "Category",
        admins: "Admin Users",
      },
      actions: {
        addRegistration: "Add Registration",
        addPlayer: "Add Player",
        addAdminUser: "Add Admin User",
        save: "Save",
        saving: "Saving…",
        cancel: "Cancel",
        delete: "Delete",
        deleting: "Deleting…",
        add: "Add",
        adding: "Adding…",
        close: "Close",
        yes: "Yes",
        no: "No",
      },
      registrations: {
        empty: "No registrations",
        columns: {
          player: "Player",
          partner: "Partner",
          score: "Score",
        },
        modal: {
          title: "Manage Registration",
          addTitle: "Add Registration",
          playerSection: "Player",
          name: "Name (EN)",
          nameKo: "Name (KO)",
          partnerName: "Partner Name",
          nameOnEtransfer: "Name on e-Transfer",
          photoConsent: "Photo / video consent",
          notes: "Notes",
          category: "Category",
        },
      },
      matches: {
        empty: "No matches",
        columns: {
          team1: "Team 1",
          team2: "Team 2",
          score: "Score",
          time: "Time",
          location: "Location",
          group: "Group",
        },
        modal: {
          title: "Edit Match",
        },
      },
      players: {
        empty: "No players",
        columns: {
          clubs: "Clubs",
        },
        modal: {
          editTitle: "Edit Player",
          addTitle: "Add Player",
        },
      },
      categories: {
        empty: "No categories",
        columns: {
          label: "Category",
          status: "Status",
          players: "Players",
        },
        modal: {
          editTitle: "Edit Category",
          statusLabel: "Status",
          playersTitle: "Registered Players",
          noPlayers: "No registrations for this category.",
        },
      },
      admins: {
        empty: "No admin users",
        columns: {
          active: "Status",
          created: "Created",
        },
        activeLabel: "Active",
        inactiveLabel: "Inactive",
        modal: {
          addTitle: "Add Admin User",
          note: "The admin will set their password on first login.",
        },
      },
    },
  },
  ko: {
    adminPage: {
      title: "관리자",
      tabs: {
        registrations: "등록",
        matches: "경기",
        players: "선수",
        categories: "카테고리",
        admins: "관리자 계정",
      },
      actions: {
        addRegistration: "등록 추가",
        addPlayer: "선수 추가",
        addAdminUser: "관리자 추가",
        save: "저장",
        saving: "저장 중…",
        cancel: "취소",
        delete: "삭제",
        deleting: "삭제 중…",
        add: "추가",
        adding: "추가 중…",
        close: "닫기",
        yes: "예",
        no: "아니오",
      },
      registrations: {
        empty: "등록 내역 없음",
        columns: {
          player: "선수",
          partner: "파트너",
          score: "점수",
        },
        modal: {
          title: "등록 관리",
          addTitle: "등록 추가",
          playerSection: "선수",
          name: "이름 (EN)",
          nameKo: "이름 (KO)",
          partnerName: "파트너 이름",
          nameOnEtransfer: "이체 시 이름",
          photoConsent: "사진/영상 동의",
          notes: "메모",
          category: "카테고리",
        },
      },
      matches: {
        empty: "경기 없음",
        columns: {
          team1: "팀 1",
          team2: "팀 2",
          score: "점수",
          time: "시간",
          location: "장소",
          group: "조",
        },
        modal: {
          title: "경기 편집",
        },
      },
      players: {
        empty: "선수 없음",
        columns: {
          clubs: "클럽",
        },
        modal: {
          editTitle: "선수 편집",
          addTitle: "선수 추가",
        },
      },
      categories: {
        empty: "카테고리 없음",
        columns: {
          label: "카테고리",
          status: "상태",
          players: "선수",
        },
        modal: {
          editTitle: "카테고리 편집",
          statusLabel: "상태",
          playersTitle: "등록된 선수",
          noPlayers: "이 카테고리에 등록된 선수가 없습니다.",
        },
      },
      admins: {
        empty: "관리자 계정 없음",
        columns: {
          active: "상태",
          created: "생성일",
        },
        activeLabel: "활성",
        inactiveLabel: "비활성",
        modal: {
          addTitle: "관리자 추가",
          note: "관리자는 첫 로그인 시 비밀번호를 설정합니다.",
        },
      },
    },
  },
} as const;
