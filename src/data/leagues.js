export const K1_GP_NIGHT_BONUS_XP = 100;

export const leagues = [
  {
    id: "k1-speed-teen-2026",
    name: "K1 Speed Teen League",
    season: "2026",
    organizer: "K1 Speed",
    description: "Teen GP nights for K1 Speed racers. Join at a location, track your race nights, and log previous results.",
    dates: [
      { date: "2026-01-06", label: "January 6, 2026" },
      { date: "2026-02-03", label: "February 3, 2026" },
      { date: "2026-03-03", label: "March 3, 2026" },
      { date: "2026-04-07", label: "April 7, 2026" },
      { date: "2026-05-05", label: "May 5, 2026" },
      { date: "2026-06-02", label: "June 2, 2026" },
      { date: "2026-07-07", label: "July 7, 2026" },
      { date: "2026-08-04", label: "August 4, 2026" },
      { date: "2026-09-01", label: "September 1, 2026" },
      { date: "2026-10-06", label: "October 6, 2026" },
      { date: "2026-11-10", label: "November 10, 2026", note: "*" },
      { date: "2026-12-01", label: "December 1, 2026" }
    ]
  },
  {
    id: "k1-speed-adult-2026",
    name: "K1 Speed Adult League",
    season: "2026",
    organizer: "K1 Speed",
    description: "Adult GP nights for K1 Speed racers. Join at a location, track your race nights, and log previous results.",
    dates: [
      { date: "2026-06-07", label: "June 7, 2026" },
      { date: "2026-07-05", label: "July 5, 2026" },
      { date: "2026-08-02", label: "August 2, 2026" },
      { date: "2026-09-13", label: "September 13, 2026", note: "*" },
      { date: "2026-10-04", label: "October 4, 2026" },
      { date: "2026-11-01", label: "November 1, 2026" },
      { date: "2026-12-06", label: "December 6, 2026" }
    ]
  },
  {
    id: "k1-circuit-semi-pro-junior-2026",
    name: "K1 Circuit Semi-Pro Junior",
    season: "2026",
    organizer: "K1 Circuit",
    trackIds: ["k1-circuit-winchester"],
    description: "Junior Semi-Pro league nights at K1 Circuit in Winchester.",
    dates: [
      { date: "2026-01-18", label: "January 18, 2026" },
      { date: "2026-02-15", label: "February 15, 2026" },
      { date: "2026-03-15", label: "March 15, 2026" },
      { date: "2026-04-12", label: "April 12, 2026" },
      { date: "2026-05-17", label: "May 17, 2026" },
      { date: "2026-06-14", label: "June 14, 2026" },
      { date: "2026-07-26", label: "July 26, 2026" },
      { date: "2026-08-23", label: "August 23, 2026" },
      { date: "2026-09-20", label: "September 20, 2026" },
      { date: "2026-10-18", label: "October 18, 2026" },
      { date: "2026-11-15", label: "November 15, 2026" }
    ]
  },
  {
    id: "k1-circuit-semi-pro-senior-heavy-2026",
    name: "K1 Circuit Semi-Pro Senior Heavy",
    season: "2026",
    organizer: "K1 Circuit",
    trackIds: ["k1-circuit-winchester"],
    description: "Senior Heavy Semi-Pro league nights at K1 Circuit in Winchester.",
    dates: [
      { date: "2026-01-16", label: "January 16, 2026" },
      { date: "2026-02-13", label: "February 13, 2026" },
      { date: "2026-03-13", label: "March 13, 2026" },
      { date: "2026-04-10", label: "April 10, 2026" },
      { date: "2026-05-15", label: "May 15, 2026" },
      { date: "2026-06-12", label: "June 12, 2026" },
      { date: "2026-07-10", label: "July 10, 2026" },
      { date: "2026-08-14", label: "August 14, 2026" },
      { date: "2026-09-11", label: "September 11, 2026" },
      { date: "2026-10-16", label: "October 16, 2026" },
      { date: "2026-11-13", label: "November 13, 2026" }
    ]
  },
  {
    id: "k1-circuit-semi-pro-senior-light-2026",
    name: "K1 Circuit Semi-Pro Senior Light",
    season: "2026",
    organizer: "K1 Circuit",
    trackIds: ["k1-circuit-winchester"],
    description: "Senior Light Semi-Pro league nights at K1 Circuit in Winchester.",
    dates: [
      { date: "2026-01-23", label: "January 23, 2026" },
      { date: "2026-02-27", label: "February 27, 2026" },
      { date: "2026-03-20", label: "March 20, 2026" },
      { date: "2026-04-24", label: "April 24, 2026" },
      { date: "2026-05-22", label: "May 22, 2026" },
      { date: "2026-06-19", label: "June 19, 2026" },
      { date: "2026-07-24", label: "July 24, 2026" },
      { date: "2026-08-21", label: "August 21, 2026" },
      { date: "2026-09-18", label: "September 18, 2026" },
      { date: "2026-10-23", label: "October 23, 2026" },
      { date: "2026-11-20", label: "November 20, 2026" }
    ]
  }
];

export const events = [
  {
    id: "vsk-3-hour-speedvegas-2026",
    name: "VSK 3 Hour Endurance at SpeedVegas",
    trackId: "speedvegas",
    type: "Endurance",
    dates: [
      { date: "2026-06-13", label: "June 13, 2026" },
      { date: "2026-09-05", label: "September 5, 2026" }
    ]
  },
  {
    id: "vsk-2-hour-speedvegas-2026",
    name: "VSK 2-hour Endurance Race",
    trackId: "speedvegas",
    type: "Endurance",
    dates: [
      { date: "2026-12-13", label: "December 13, 2026" }
    ]
  }
];
