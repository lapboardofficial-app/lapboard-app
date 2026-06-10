// Add track photos to /public/tracks and set image to "/tracks/your-file.jpg".
// Layouts can be strings or { name, image }. Use objects when each layout needs its own image.
// Example: { name: "North Track", image: "/tracks/k1-circuit-north.jpg" }
// Official track records can be added per layout with trackRecords.
// Example: trackRecords: { "Main layout": { time: "24.135", holder: "Track record holder" } }
const K1_DEFAULT_IMAGE = "https://www.k1speed.com/wp-content/uploads/2021/01/slide-3-karts.jpg";
const K1_MAIN_LAYOUT_RECORD = { "Main layout": { holder: "Official record TBD" } };

export const tracks = [
  {
    id: "k1-torrance",
    name: "K1 Speed Torrance",
    city: "Torrance, California",
    layout: "Indoor electric karting",
    layouts: [
      { name: "Main layout", image: "" }
    ],
    aliases: ["Torrance"],
    image: "https://www.k1speed.com/wp-content/uploads/2026/02/k1-speed-torrance-event-venue.jpg",
    trackRecords: {
      "Main layout": {
        time: "27.020",
        holder: "Michael C"
      }
    },
    notes: "Torrance is a tight, rhythm-heavy indoor K1 with quick direction changes and a layout that rewards clean exits more than aggressive moves. The corners come up fast, so a small slide can unsettle the next section."
  },
  {
    id: "irvine",
    name: "K1 Speed Irvine",
    city: "Irvine, California",
    layout: "Indoor electric karting",
    layouts: [
      { name: "Track 1", image: "" },
      { name: "Track 2", image: "" }
    ],
    aliases: ["Irvine"],
    image: "https://www.k1speed.com/wp-content/uploads/2026/02/k1-speed-irvine-birthday-venue.jpg",
    trackRecords: {
      "Track 1": { time: "22.533" },
      "Track 2": { time: "18.941", holder: "S. O'Hearn" }
    },
    notes: "Irvine has two indoor layouts with different personalities: one feels more flowing and technical, while the shorter track is tighter and more rhythmic. Both layouts have the classic electric-kart punch out of slower corners."
  },
  {
    id: "k1-circuit-winchester",
    name: "K1 Circuit",
    city: "Winchester, California",
    layout: "Outdoor karting complex",
    layouts: [
      { name: "North Track", image: "https://www.k1circuit.com/wp-content/uploads/2024/08/north-track-082024.png" },
      { name: "South Track", image: "https://www.k1circuit.com/wp-content/uploads/2024/07/south-track-070924.png" },
      { name: "Pro Track", image: "https://www.k1circuit.com/wp-content/uploads/2024/08/pro-track-082024.png" },
      { name: "Pro Track with Chicanes", image: "https://www.k1circuit.com/wp-content/uploads/2024/08/pro-track-chicanes-082024.png" },
      { name: "Nationals layout", image: "" },
      { name: "Pro Track + Chicanes & Tic-Tac-Toe", image: "" },
      { name: "Pro Track + Tic-Tac-Toe", image: "" },
      { name: "Pro Track Chicanes & Bus Stop", image: "" },
      { name: "Pro Track Chicanes, Hairpin & Bus Stop", image: "" },
      { name: "Pro Track with Bus Stop", image: "" },
      { name: "Pro Track, Hairpin & Bus Stop", image: "" },
      { name: "Pro Track w/hairpin", image: "" },
      { name: "Pro Track with Chicanes and Hairpin", image: "" }
    ],
    aliases: ["K1 Circuit Winchester", "Winchester", "K1 Outdoor"],
    image: "https://www.k1circuit.com/wp-content/uploads/2024/08/k1circuit-complex.jpg",
    trackRecords: {},
    notes: "K1 Circuit is a large outdoor karting complex with layouts that can feel totally different depending on the configuration. The longer Pro variants let the kart build speed, while the smaller sections make braking points and exits feel extra important."
  },
  {
    id: "fort-lauderdale",
    name: "K1 Speed Fort Lauderdale",
    city: "Fort Lauderdale, Florida",
    layout: "Indoor electric karting",
    layouts: [
      { name: "Track 1", image: "" },
      { name: "Track 2", image: "" }
    ],
    aliases: ["FortLauderdale", "Fort Lauderdale"],
    image: "https://www.k1speed.com/wp-content/uploads/2026/02/k1-speed-fort-lauderdale-go-kart.jpg",
    trackRecords: {
      "Track 1": { time: "26.847", holder: "J. Carpentier" },
      "Track 2": { time: "17.030", holder: "H. Patel" }
    },
    notes: "Fort Lauderdale gives you two indoor tracks and a lot of places to lose time if you get impatient. The best laps usually come from keeping the kart pointed straight on exit and not overdriving the slower corners."
  },
  {
    id: "k1-orlando",
    name: "K1 Speed Orlando",
    city: "Orlando, Florida",
    layout: "Indoor electric karting",
    layouts: [
      { name: "Track 1", image: "" },
      { name: "Track 2", image: "" }
    ],
    aliases: ["Orlando", "K1 Orlando"],
    image: "https://www.k1speed.com/wp-content/uploads/2026/02/k1-speed-orlando-corporate-event.jpg",
    trackRecords: {
      "Track 1": { holder: "Official record TBD" },
      "Track 2": { holder: "Official record TBD" }
    },
    notes: "Orlando is a busy Florida K1 with two layouts: a longer main track and a shorter, punchier configuration. The corners are close enough together that traffic and momentum both matter."
  },
  {
    id: "culver",
    name: "K1 Speed Culver City",
    city: "Culver City, California",
    layout: "Indoor electric karting",
    layouts: [
      { name: "Main layout", image: "" }
    ],
    aliases: ["Culver"],
    image: "https://www.k1speed.com/wp-content/uploads/2025/09/culver-City-27-scaled.jpg",
    trackRecords: {
      "Main layout": { time: "29.300" }
    },
    notes: "Culver City is compact and quick to learn, but the layout gets picky once the pace comes up. There is not much room to hide a bad corner, so tidy driving matters."
  },
  {
    id: "speedvegas",
    name: "SpeedVegas",
    city: "Las Vegas, Nevada",
    layout: "Outdoor rental karting",
    layouts: [
      { name: "Main layout", image: "" }
    ],
    aliases: ["Speedvegas"],
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9b/Speed_Vegas_Motorsports_Park_aerial_photo_20220611.jpg/960px-Speed_Vegas_Motorsports_Park_aerial_photo_20220611.jpg",
    trackRecords: {
      "Main layout": { time: "38.112" }
    },
    notes: "SpeedVegas feels more open than the indoor tracks, with longer straights and bigger braking zones that let the kart stretch its legs. The layout has more of an outdoor rental-circuit feel than a short indoor sprint."
  },
  {
    id: "adams-motorsports-park",
    name: "Adams Motorsports Park",
    city: "Riverside, California",
    layout: "Outdoor karting and motorsports",
    layouts: [
      { name: "Main layout", image: "" },
      { name: "Rental layout", image: "" },
      { name: "League layout", image: "" }
    ],
    aliases: ["Adams", "Adams Kart Track"],
    image: "https://adamsmotorsportspark.com/wp-content/uploads/2023/07/AMP-Karting-Leagues.png",
    trackRecords: {},
    notes: "Adams has that classic Southern California kart-track feel: simple on the surface, scrappy in the best way, and full of little details once the pace comes up. The circuit rewards momentum and confident corner entry."
  },
  {
    id: "apex-racing-center",
    name: "Apex Racing Center",
    city: "Perris, California",
    layout: "Outdoor karting",
    layouts: [
      { name: "Main layout", image: "" },
      { name: "Clockwise", image: "" },
      { name: "Counter-clockwise", image: "" }
    ],
    aliases: ["Apex", "Apex Kart Racing"],
    image: "https://apexmotorsportspark.com/wp-content/uploads/2025/11/track-scaled.png",
    trackRecords: {},
    notes: "Apex is an outdoor Perris track that starts to flow once the kart is settled through the longer corners. The layout suits committed driving, smooth hands, and confidence on corner entry."
  },
  {
    id: "buttonwillow-kart-track",
    name: "Buttonwillow Kart Track",
    city: "Buttonwillow, California",
    layout: "Outdoor kart track",
    layouts: [
      { name: "Main layout", image: "" },
      { name: "Monte Carlo", image: "" },
      { name: "Long Beach", image: "" },
      { name: "Bonneville", image: "" }
    ],
    aliases: ["Buttonwillow", "BRP Kart Track"],
    image: "https://buttonwillowraceway.com/wp-content/uploads/2024/10/Track-Info-Buttonwillow-Raceway-Park-3.jpg",
    trackRecords: {},
    notes: "Buttonwillow gives you proper kart-track variety, with configurations that can change the whole character of the circuit. The track has enough room for braking technique, race lines, and longer corner sequences to matter."
  },
  {
    id: "willow-springs-kart-track",
    name: "Willow Springs Kart Track",
    city: "Rosamond, California",
    layout: "Outdoor sprint kart track",
    layouts: [
      { name: "Main layout", image: "" },
      { name: "Counter-clockwise", image: "" }
    ],
    aliases: ["Willow Springs", "Willow Springs Raceway"],
    image: "https://www.willowspringsraceway.com/wp-content/smush-avif/2021/10/sp-hero.jpg.avif",
    trackRecords: {},
    notes: "Willow Springs looks straightforward, but the fun is in linking the corners without scrubbing speed. The layout is more about momentum and confidence than one single perfect braking point."
  },
  {
    id: "apple-valley-speedway",
    name: "Apple Valley Speedway",
    city: "Apple Valley, California",
    layout: "Outdoor owner-driver karting",
    layouts: [
      { name: "Main layout", image: "" }
    ],
    aliases: ["Grange Motor Circuit", "Grange"],
    image: "https://applevalleyspeedway.com/wp-content/uploads/2023/03/Main-2023.jpg",
    trackRecords: {},
    notes: "Apple Valley has a raw high-desert feel with plenty of space to let the kart move around. The faster sections reward confidence, while the slower corners still ask for clean rotation."
  },
  {
    id: "sb-raceway",
    name: "SB Raceway",
    city: "San Bernardino, California",
    layout: "Indoor gas karting",
    layouts: [
      { name: "Main layout", image: "" }
    ],
    aliases: ["San Bernardino Raceway", "SB Raceway Indoor Karting"],
    image: "https://sbraceway.com/assets/images/index-meta.webp",
    trackRecords: {
      "Main layout": { time: "19.682" }
    },
    notes: "SB Raceway has the punchy, slightly rough-around-the-edges feel people like about indoor gas karting. The track is short and busy, with enough corner variety for smoother inputs to make a difference."
  },
  {
    id: "mb2-raceway-sylmar",
    name: "MB2 Raceway",
    city: "Sylmar, California",
    layout: "Indoor electric karting",
    layouts: [
      { name: "Main layout", image: "" }
    ],
    aliases: ["MB2 Raceway Sylmar", "MB2 Sylmar", "MB2"],
    image: "https://cdn-ilcmfbj.nitrocdn.com/VcRAPFhsnfLfFwFYkLYxxVKhzEMvJYon/assets/images/optimized/rev-60c8f84/mb2raceway.com/wp-content/uploads/2023/02/Sylmar-Racetrack.jpg",
    trackRecords: {
      "Main layout": { time: "20.283" }
    },
    notes: "MB2 Sylmar is easy to jump into, but the layout still asks for a clean line. It rewards keeping the kart settled instead of forcing every corner."
  },
  {
    id: "k1-anaheim",
    name: "K1 Speed Anaheim",
    city: "Anaheim, California",
    layout: "Indoor electric karting",
    layouts: [
      { name: "Main layout", image: "" }
    ],
    aliases: ["Anaheim"],
    image: "https://www.k1speed.com/wp-content/uploads/2026/02/k1-speed-anaheim-karting.jpg",
    trackRecords: {
      "Main layout": { time: "24.989" }
    },
    notes: "Anaheim is a classic indoor K1 where the track feels best when the kart is braked straight, rotated once, and back on power early. The layout is approachable, but the tighter sections still reward precision."
  },
  {
    id: "k1-ontario",
    name: "K1 Speed Ontario",
    city: "Ontario, California",
    layout: "Indoor electric karting",
    layouts: [
      { name: "Main layout", image: "" }
    ],
    aliases: ["Ontario"],
    image: "https://www.k1speed.com/wp-content/uploads/2026/02/k1-speed-ontario-corporate-event.jpg",
    trackRecords: {
      "Main layout": { time: "23.836" }
    },
    notes: "Ontario is a quick indoor layout with enough technical corners to keep the kart busy. The track rewards repeatable braking points and clean exits."
  },
  {
    id: "k1-burbank",
    name: "K1 Speed Burbank",
    city: "Burbank, California",
    layout: "Indoor electric karting",
    layouts: [
      { name: "Track 1", image: "" },
      { name: "Track 2", image: "" }
    ],
    aliases: ["Burbank"],
    image: "https://www.k1speed.com/wp-content/uploads/2026/02/k1-speed-burbank-karting.jpg",
    trackRecords: {
      "Track 1": { time: "23.206" },
      "Track 2": { time: "16.851", holder: "Kai M." }
    },
    notes: "Burbank has two indoor layouts: a longer Track 1 and a shorter, sharper Track 2. It is a busy LA-area K1 where the tighter sections make patience and clean exits important."
  },
  {
    id: "k1-carlsbad",
    name: "K1 Speed Carlsbad",
    city: "Carlsbad, California",
    layout: "Indoor electric karting",
    layouts: [
      { name: "Main layout", image: "" }
    ],
    aliases: ["Carlsbad"],
    image: "https://www.k1speed.com/wp-content/uploads/2026/02/K1-Carlsbad-Go-Karts.jpg",
    trackRecords: {
      "Main layout": { time: "28.562" }
    },
    notes: "Carlsbad has a friendly rental-kart feel, but the layout still exposes messy hands and rushed throttle. The corners reward smooth inputs and early commitment back to power."
  },
  {
    id: "k1-san-diego",
    name: "K1 Speed San Diego",
    city: "San Diego, California",
    layout: "Indoor electric karting",
    layouts: [
      { name: "Main layout", image: "" }
    ],
    aliases: ["San Diego"],
    image: "https://www.k1speed.com/wp-content/uploads/2026/02/K1-san-diego-corporate-event.jpg",
    trackRecords: {
      "Main layout": { time: "22.294" }
    },
    notes: "San Diego is a compact indoor K1 where neat driving matters, especially when traffic starts bunching up. The layout rewards patience and a stable line through the tighter sections."
  },
  {
    id: "k1-thousand-oaks",
    name: "K1 Speed Thousand Oaks",
    city: "Thousand Oaks, California",
    layout: "Indoor electric karting",
    layouts: [
      { name: "Main layout", image: "" }
    ],
    aliases: ["Thousand Oaks"],
    image: "https://www.k1speed.com/wp-content/uploads/2026/02/k1-speed-thousand-oaks-corporate-event.jpg",
    trackRecords: {
      "Main layout": { time: "27.793" }
    },
    notes: "Thousand Oaks is a technical indoor venue where the rhythm improves once the patient corners start to make sense. The layout has a nice mix of slow rotation and early-throttle exits."
  },
  {
    id: "k1-chula-vista",
    name: "K1 Speed Chula Vista",
    city: "Chula Vista, California",
    layout: "Indoor electric karting",
    layouts: [
      { name: "Main layout", image: "" }
    ],
    aliases: ["Chula Vista"],
    image: "https://www.k1speed.com/wp-content/uploads/2026/02/K1-Chula-Vista-corporate-event.jpg",
    trackRecords: {
      "Main layout": { time: "20.933" }
    },
    notes: "Chula Vista has a short, competitive indoor layout where the corners arrive quickly. It feels best when the kart stays tidy and the exits are linked cleanly."
  },
  {
    id: "k1-corona",
    name: "K1 Speed Corona",
    city: "Corona, California",
    layout: "Indoor electric karting",
    layouts: [
      { name: "Main layout", image: "" }
    ],
    aliases: ["Corona"],
    image: "https://www.k1speed.com/wp-content/uploads/2026/02/k1-speed-corona-go-karting.jpg",
    trackRecords: {
      "Main layout": { time: "26.575" }
    },
    notes: "Corona rewards rhythm more than aggression, with a layout that punishes overdriving pretty quickly. When you get the timing right, the lap feels smooth instead of forced."
  },
  {
    id: "k1-phoenix",
    name: "K1 Speed Phoenix",
    city: "Phoenix, Arizona",
    layout: "Indoor electric karting",
    layouts: [
      { name: "Track 1", image: "" },
      { name: "Track 2", image: "" }
    ],
    aliases: ["Phoenix", "K1 Phoenix", "Scottsdale", "Glendale"],
    image: "https://www.k1speed.com/wp-content/uploads/2025/01/sl-kart-location-slide-desktop.jpg",
    trackRecords: {
      "Track 1": { time: "23.887", holder: "Sean O.", juniorTime: "28.541" },
      "Track 2": { time: "20.746", holder: "Jaclyn S.", juniorTime: "25.476" }
    },
    notes: "Phoenix has two indoor tracks and a long-running K1 feel, with quick electric launches and two layouts that ask for slightly different driving styles. Track 1 feels more flowing, while Track 2 is shorter and more compressed."
  },
  {
    id: "k1-miami",
    name: "K1 Speed Miami",
    city: "Medley, Florida",
    layout: "Indoor electric karting",
    layouts: [
      { name: "Track 1", image: "" },
      { name: "Track 2", image: "" }
    ],
    aliases: ["Miami", "Medley", "K1 Miami"],
    image: K1_DEFAULT_IMAGE,
    trackRecords: {
      "Track 1": { time: "18.722" },
      "Track 2": { time: "20.466", juniorTime: "22.148" }
    },
    notes: "Miami has two indoor layouts and the busy arrive-and-drive energy you expect from a South Florida K1. The track is tight enough that small mistakes carry into the next corner quickly."
  },
  {
    id: "k1-daytona-beach",
    name: "K1 Speed Daytona Beach",
    city: "Daytona Beach, Florida",
    layout: "Indoor electric karting",
    layouts: [
      { name: "Main layout", image: "" }
    ],
    aliases: ["Daytona", "Daytona Beach"],
    image: K1_DEFAULT_IMAGE,
    trackRecords: {
      "Main layout": { time: "30.005" }
    },
    notes: "Daytona Beach has a straightforward indoor K1 layout with enough corner work to reward tidy driving. It fits the race-heavy Daytona area with a compact, easy-to-run indoor track."
  },
  {
    id: "k1-atlanta-duluth",
    name: "K1 Speed Atlanta - Duluth",
    city: "Duluth, Georgia",
    layout: "Indoor electric karting",
    layouts: [
      { name: "Main layout", image: "" }
    ],
    aliases: ["Atlanta", "Duluth", "K1 Atlanta"],
    image: K1_DEFAULT_IMAGE,
    trackRecords: {
      "Main layout": { time: "21.753" }
    },
    notes: "Atlanta-Duluth has the familiar K1 electric-kart punch, but the layout still asks you to manage braking and exits instead of just relying on acceleration. The venue has a clean indoor rhythm with enough technical corners to keep it lively."
  },
  {
    id: "k1-chicago-addison",
    name: "K1 Speed Chicago - Addison",
    city: "Addison, Illinois",
    layout: "Indoor electric karting",
    layouts: [
      { name: "Track 1", image: "" },
      { name: "Track 2", image: "" }
    ],
    aliases: ["Chicago", "Addison", "K1 Addison"],
    image: K1_DEFAULT_IMAGE,
    trackRecords: {
      "Track 1": { time: "18.547" },
      "Track 2": { time: "20.522", juniorTime: "24.531" }
    },
    notes: "Addison has two indoor tracks with a proper Midwest K1 feel. One layout is more flowing, while the other is more compressed and rhythm-focused."
  },
  {
    id: "k1-mokena",
    name: "K1 Speed Mokena",
    city: "Mokena, Illinois",
    layout: "Indoor electric karting",
    layouts: [
      { name: "Track 1", image: "" },
      { name: "Track 2", image: "" }
    ],
    aliases: ["Mokena", "K1 Mokena", "Chicago Mokena"],
    image: K1_DEFAULT_IMAGE,
    trackRecords: {
      "Track 1": { holder: "Official record TBD" },
      "Track 2": { holder: "Official record TBD" }
    },
    notes: "Mokena gives the Chicago area another two-layout K1 option, with configurations that feel meaningfully different from each other. The venue has the tight indoor rhythm and instant electric-kart response that suits repeat sessions."
  },
  {
    id: "k1-las-vegas",
    name: "K1 Speed Las Vegas",
    city: "Las Vegas, Nevada",
    layout: "Indoor electric karting",
    layouts: [
      { name: "Track 1", image: "" },
      { name: "Track 2", image: "" }
    ],
    aliases: ["Las Vegas", "Vegas", "K1 Vegas"],
    image: K1_DEFAULT_IMAGE,
    trackRecords: {
      "Track 1": { holder: "Official record TBD" },
      "Track 2": { holder: "Official record TBD" }
    },
    notes: "K1 Las Vegas has two indoor tracks and a much tighter feel than the outdoor SpeedVegas circuit. It is the quick indoor option in town, with electric-kart acceleration and compact corner sequences."
  },
  {
    id: "k1-salt-lake-city-sandy",
    name: "K1 Speed Salt Lake City - Sandy",
    city: "Sandy, Utah",
    layout: "Indoor electric karting",
    layouts: [
      { name: "Main layout", image: "" }
    ],
    aliases: ["Salt Lake City", "Sandy", "K1 Salt Lake City"],
    image: K1_DEFAULT_IMAGE,
    trackRecords: {
      "Main layout": { time: "22.270" }
    },
    notes: "Salt Lake City-Sandy is a straightforward indoor K1 where repeatable braking points and clean exits make the track feel approachable. The layout has enough technical work to stay interesting once the rhythm settles in."
  },
  {
    id: "k1-dulles",
    name: "K1 Speed Dulles",
    city: "Dulles, Virginia",
    layout: "Indoor electric karting",
    layouts: [
      { name: "Main layout", image: "" }
    ],
    aliases: ["Dulles", "K1 Dulles", "Northern Virginia"],
    image: K1_DEFAULT_IMAGE,
    trackRecords: {
      "Main layout": { time: "19.160" }
    },
    notes: "Dulles gives Northern Virginia a clean indoor K1 layout with compact corners and quick electric-kart launches. The venue has enough corner variety to keep repeat sessions from feeling flat."
  },
  {
    id: "k1-mount-kisco",
    name: "K1 Speed Mount Kisco",
    city: "Mount Kisco, New York",
    layout: "Indoor electric karting",
    layouts: [
      { name: "Main layout", image: "" }
    ],
    aliases: ["Mount Kisco", "K1 Mount Kisco", "Westchester"],
    image: K1_DEFAULT_IMAGE,
    trackRecords: K1_MAIN_LAYOUT_RECORD,
    notes: "Mount Kisco is a Westchester K1 stop with quick indoor sections and a compact layout. The track has the familiar electric-kart rhythm of short straights, hard braking, and early exits."
  },
  {
    id: "k1-west-nyack",
    name: "K1 Speed West Nyack",
    city: "West Nyack, New York",
    layout: "Indoor electric karting",
    layouts: [
      { name: "Main layout", image: "" }
    ],
    aliases: ["West Nyack", "K1 West Nyack", "Palisades"],
    image: K1_DEFAULT_IMAGE,
    trackRecords: {
      "Main layout": { time: "17.862" }
    },
    notes: "West Nyack is a compact New York-area K1 with short straights and a tight indoor rhythm. The track rewards keeping the kart neat through the slower sections."
  },
  {
    id: "k1-totowa",
    name: "K1 Speed Totowa",
    city: "Totowa, New Jersey",
    layout: "Indoor electric karting",
    layouts: [
      { name: "Track 1", image: "" },
      { name: "Track 2", image: "" }
    ],
    aliases: ["Totowa", "K1 Totowa", "New Jersey", "NJ"],
    image: K1_DEFAULT_IMAGE,
    trackRecords: {
      "Track 1": { holder: "Official record TBD" },
      "Track 2": { holder: "Official record TBD" }
    },
    notes: "Totowa has two indoor tracks, giving the New Jersey venue a nice mix of layout styles. Track 1 and Track 2 each have their own rhythm, braking zones, and corner flow."
  },
  {
    id: "k1-canton",
    name: "K1 Speed Canton",
    city: "Canton, Ohio",
    layout: "Indoor electric karting",
    layouts: [
      { name: "Indoor track", image: "" },
      { name: "Outdoor track", image: "" }
    ],
    aliases: ["Canton", "K1 Canton"],
    image: K1_DEFAULT_IMAGE,
    trackRecords: {
      "Indoor track": { time: "24.963", juniorTime: "26.723" },
      "Outdoor track": { time: "38.141", juniorTime: "43.890" }
    },
    notes: "Canton has both an indoor track and an outdoor track, giving the venue two very different driving styles. The indoor side is tighter and more technical, while the outdoor side has more room to breathe and carry speed."
  },
  {
    id: "indoor-karting-barcelona",
    name: "Indoor Karting Barcelona",
    city: "Viladecans, Barcelona, Spain",
    layout: "Indoor karting",
    layouts: [
      { name: "Main layout", image: "" }
    ],
    aliases: ["Gené Karting", "Gene Karting", "Barcelona Gené Karting", "Barcelona Gene Karting"],
    image: "https://indoorkartingbarcelona.com/wp-content/uploads/2026/01/IK_Banner_1920x900_Home_2026.png",
    trackRecords: {
      "Main layout": { time: "39.882" }
    },
    notes: "Indoor Karting Barcelona has a polished rental-kart feel and a layout that rewards staying smooth instead of getting dramatic with the wheel. The track has a clean indoor flow with enough technical sections to keep it interesting."
  },
  {
    id: "carlos-sainz-karting-las-rozas",
    name: "Carlos Sainz Karting Las Rozas",
    city: "Las Rozas, Madrid, Spain",
    layout: "Indoor karting",
    layouts: [
      { name: "Main layout", image: "" }
    ],
    aliases: ["Karting Carlos Sainz", "Carlos Sainz Karting", "CS Karting Las Rozas"],
    image: "https://cdn.prod.website-files.com/677d130deac426e137f9a66a/6792792bcd3564c82d3212c8_OpenGraph%20image.jpg",
    trackRecords: {
      "Main layout": { time: "30.028" }
    },
    notes: "Carlos Sainz Karting Las Rozas has a distinctive indoor feel and a layout that is more about precision than big hero moves. The venue carries a polished Madrid karting identity with a technical, well-defined track."
  },
  {
    id: "dallas-karting-complex",
    name: "Dallas Karting Complex",
    city: "Caddo Mills, Texas",
    layout: "Outdoor sprint karting",
    layouts: [
      { name: "Main layout", image: "" }
    ],
    image: "https://dallaskartingcomplex.com/wp-content/uploads/2024/03/Dallas_Karting_Complex_February_2024_Endurance_Race_7.jpg",
    trackRecords: {},
    notes: "Dallas Karting Complex is a proper outdoor karting facility where rental racers and owner-drivers can both get a real sense of speed. It is a strong contrast to the indoor K1 tracks because braking, drafting, and momentum feel more stretched out."
  },
  {
    id: "new-castle-motorsports",
    name: "New Castle Motorsports Park",
    city: "New Castle, Indiana",
    layout: "Outdoor national karting",
    layouts: [
      { name: "Main layout", image: "" }
    ],
    image: "https://newcastlemotorsportspark.com/hs-fs/hubfs/New%20Castle%20Motor%20Sports%20Park/MDA_8556.jpg?width=1800&height=1200&name=MDA_8556.jpg",
    trackRecords: {},
    notes: "New Castle is a serious outdoor karting facility with enough track length to make every sector matter. It has more of a club-racing feel than a casual rental stop, with long sequences that reward commitment and precision."
  },
  {
    id: "speedsportz",
    name: "Speedsportz Racing Park",
    city: "New Caney, Texas",
    layout: "Outdoor rental and competition karting",
    layouts: [
      { name: "Main layout", image: "" }
    ],
    image: "https://speedsportzracingpark.com/wp-content/uploads/2025/06/Speedsportz-Banner-Arrive-Drive.jpg",
    trackRecords: {},
    notes: "Speedsportz has the feel of a real track-day venue, with rental and competition karting living in the same world. It is a good fit for drivers who want something more open and race-like than a short indoor session."
  }
];
