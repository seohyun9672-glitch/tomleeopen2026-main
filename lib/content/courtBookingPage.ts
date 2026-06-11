export const courtBookingPage = {
  en: {
    courtBookingPage: {
      heroTitle: "Book a Court",
      description:
        "Book a court up to 7 days in advance. Available slots are first-come, first-served.",
      fields: {
        match: "Select Match",
        matchPlaceholder: "Enter your name to find your match",
        matchBooked: "booked",
        court: "Court",
        courtAvailable: "Available",
        courtBooked: "Booked",
        noCourts: "No courts for this date.",
        outsideWindow: "Courts can only be booked up to 7 days in advance.",
        courtsNotOpenYet: "Court booking opens on",
        date: "Date",
        notes: "Notes (optional)",
      },
      submit: "Book court",
      submitting: "Booking...",
      confirmation: {
        title: "Booking confirmed!",
      },
      errors: {
        match: "Please select a match.",
        court: "Please select a court.",
        date: "Please select a date.",
        failed: "Booking failed.",
      },
    },
  },
  ko: {
    courtBookingPage: {
      heroTitle: "코트 예약",
      description:
        "코트는 최대 7일 전부터 선착순으로 예약할 수 있습니다.",
      fields: {
        match: "경기 선택",
        matchPlaceholder: "이름을 입력하여 경기를 검색하세요",
        matchBooked: "예약됨",
        court: "코트",
        courtAvailable: "예약 가능",
        courtBooked: "예약됨",
        noCourts: "해당 날짜에 예약 가능한 코트가 없습니다.",
        outsideWindow: "오늘부터 7일 이내의 날짜만 예약 가능합니다.",
        courtsNotOpenYet: "코트 예약 시작일:",
        date: "날짜",
        notes: "메모 (선택사항)",
      },
      submit: "코트 예약",
      submitting: "예약 중...",
      confirmation: {
        title: "예약이 완료되었습니다!",
      },
      errors: {
        match: "경기를 선택하세요.",
        court: "코트를 선택하세요.",
        date: "날짜를 선택하세요.",
        failed: "예약에 실패했습니다.",
      },
    },
  },
} as const;
