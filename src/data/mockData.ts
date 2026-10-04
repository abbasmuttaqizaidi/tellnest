export interface Chapter {
  id: string
  number: number
  title: string
  subtitle?: string
  status: 'published' | 'draft' | 'scheduled'
  isNew?: boolean
  isUpdated?: boolean
  wordCount: number
  readTimeMinutes: number
  publishedAt?: string
  updatedAt?: string
  content: string
}

export interface Author {
  id: string
  name: string
  handle: string
  avatar: string
  bio: string
  location?: string
  worksCount: number
  followersCount: number
  totalReads: string
  featuredQuote?: string
  verified?: boolean
}

export interface Work {
  id: string
  title: string
  subtitle?: string
  author: Author
  cover: string
  category: string
  categorySlug: string
  genre: string
  genreSlug: string
  tags: string[]
  language: string
  status: 'Ongoing' | 'Completed' | 'On Hiatus' | 'Cancelled'
  visibility: 'Public' | 'Unlisted' | 'Draft'
  isMature: boolean
  featured?: boolean
  trending?: boolean
  rising?: boolean
  editorPick?: boolean
  synopsis: string
  fullDescription: string
  chaptersCount: number
  publishedChaptersCount: number
  totalReads: string
  totalSaves: number
  ratingScore: number
  ratingCount: number
  createdAt: string
  updatedAt: string
  chapters: Chapter[]
}

export interface CategoryInfo {
  name: string
  slug: string
  description: string
  worksCount: number
  accentLetter: string
}

export interface GenreInfo {
  name: string
  slug: string
  description: string
  worksCount: number
}

export interface FeedEvent {
  id: string
  type: 'chapter_release' | 'new_work' | 'milestone' | 'recommendation'
  author: Author
  work: {
    id: string
    title: string
    cover: string
    category: string
    genre: string
  }
  chapter?: {
    id: string
    number: number
    title: string
  }
  timestamp: string
  note?: string
}

export interface CommentItem {
  id: string
  workId: string
  chapterId: string
  authorName: string
  authorHandle: string
  authorAvatar: string
  isWorkAuthor?: boolean
  content: string
  timestamp: string
  likesCount: number
  userLiked?: boolean
  replies?: CommentItem[]
}

export const CATEGORIES: CategoryInfo[] = [
  { name: 'Fiction', slug: 'fiction', description: 'Imaginative storytelling spanning modern realism, speculative worlds, and human conflict.', worksCount: 1420, accentLetter: 'F' },
  { name: 'Novels', slug: 'novels', description: 'Long-form narrative architecture with deep character psychology and continuous arcs.', worksCount: 890, accentLetter: 'N' },
  { name: 'Short Stories', slug: 'short-stories', description: 'Compressed, sharp, and impactful singular narratives designed for solitary reading.', worksCount: 2310, accentLetter: 'S' },
  { name: 'Essays', slug: 'essays', description: 'Thoughtful cultural critiques, literary philosophy, and meditations on contemporary life.', worksCount: 1640, accentLetter: 'E' },
  { name: 'Poetry', slug: 'poetry', description: 'Verse, cadence, and measured brevity exploring memory, form, and quiet revelations.', worksCount: 940, accentLetter: 'P' },
  { name: 'Creative Non-Fiction', slug: 'creative-non-fiction', description: 'Truth rendered with literary precision, memoir, investigative journeys, and witness.', worksCount: 780, accentLetter: 'C' },
  { name: 'Personal Narratives', slug: 'personal-narratives', description: 'Firsthand dispatches of transformation, grief, displacement, and human endurance.', worksCount: 650, accentLetter: 'M' },
  { name: 'Serialized Stories', slug: 'serialized-stories', description: 'Episodic publishing released chapter by chapter with evolving communal discourse.', worksCount: 1120, accentLetter: 'Z' },
  { name: 'Scripts', slug: 'scripts', description: 'Screenplays, stage plays, audio dramas, and cinematic dialogue manuscripts.', worksCount: 320, accentLetter: 'D' },
  { name: "Children's Stories", slug: 'childrens-stories', description: 'Fables, wonder, and moral architecture crafted for young minds and bedtime reading.', worksCount: 410, accentLetter: 'K' },
  { name: 'Fan Fiction', slug: 'fan-fiction', description: 'Reimagined mythologies and character explorations in established canonical universes.', worksCount: 1850, accentLetter: 'X' },
]

export const GENRES: GenreInfo[] = [
  { name: 'Literary', slug: 'literary', description: 'Focus on stylistic depth, interiority, and thematic resonance.', worksCount: 1840 },
  { name: 'Mystery', slug: 'mystery', description: 'Procedural deductions, missing persons, and secrets buried beneath civility.', worksCount: 960 },
  { name: 'Thriller', slug: 'thriller', description: 'High-stakes tension, psychological claustrophobia, and ticking clocks.', worksCount: 820 },
  { name: 'Science Fiction', slug: 'science-fiction', description: 'Technological futures, orbital mechanics, planetary solitude, and artificial minds.', worksCount: 1140 },
  { name: 'Fantasy', slug: 'fantasy', description: 'Ancient archives, subtle magics, forgotten dynasties, and cartographic voyages.', worksCount: 1390 },
  { name: 'Historical', slug: 'historical', description: 'Faithful recreations of vanished centuries, wars, and private letters.', worksCount: 670 },
  { name: 'Romance', slug: 'romance', description: 'Intimacy, longing, fragile pacts, and the quiet gravitation between two lives.', worksCount: 1580 },
  { name: 'Philosophy', slug: 'philosophy', description: 'Epistemology, architectural ethics, mortality, and modern solitude.', worksCount: 490 },
]

export const AUTHORS: Author[] = [
  {
    id: 'auth-1',
    name: 'Julian Montgomery',
    handle: 'jmontgomery',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    bio: 'Author of three serials on modern cartography and psychological exile. Former maritime archivist based in Edinburgh.',
    location: 'Edinburgh, UK',
    worksCount: 4,
    followersCount: 14200,
    totalReads: '1.2M',
    featuredQuote: 'We do not travel to find landscapes, but to see what our silence looks like against unfamiliar stone.',
    verified: true,
  },
  {
    id: 'auth-2',
    name: 'Elena Rostova',
    handle: 'elena_rostova',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80',
    bio: 'Novelist and essayist exploring cold-war architectural memory, satellite communications, and human fragility.',
    location: 'Geneva, Switzerland',
    worksCount: 6,
    followersCount: 22800,
    totalReads: '2.4M',
    featuredQuote: 'Every abandoned radio tower is still waiting for the frequency it was built to receive.',
    verified: true,
  },
  {
    id: 'auth-3',
    name: 'Kenji Takahashi',
    handle: 'kenjitakahashi',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
    bio: 'Short fiction writer and translator. Recipient of the Pacific Literary Fellowship. Writing on night transit and memory.',
    location: 'Kyoto, Japan',
    worksCount: 3,
    followersCount: 8900,
    totalReads: '640K',
    featuredQuote: 'The rain in Kyoto arrives without preamble, like an old agreement kept in secret.',
    verified: true,
  },
  {
    id: 'auth-4',
    name: 'Soren Vance',
    handle: 'sorenvance',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80',
    bio: 'Investigative essayist and cultural theorist. Writing at the intersection of bureaucratic systems and individual conscience.',
    location: 'Berlin, Germany',
    worksCount: 5,
    followersCount: 16500,
    totalReads: '1.8M',
    featuredQuote: 'Institutions do not lie; they simply redefine vocabulary until reality ceases to interfere.',
    verified: true,
  },
  {
    id: 'auth-5',
    name: 'Mara Lindqvist',
    handle: 'maralindqvist',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=300&q=80',
    bio: 'Poet and naturalist. Documenting subarctic coastlines, migratory routes, and the language of stone.',
    location: 'Tromsø, Norway',
    worksCount: 2,
    followersCount: 6400,
    totalReads: '310K',
    featuredQuote: 'Snow is not silence; it is the physical weight of everything the sky has chosen to forget.',
    verified: true,
  }
]

export const WORKS: Work[] = [
  {
    id: 'work-1',
    title: 'The Cold Perimeter',
    subtitle: 'A Novel of Atmospheric Reconnaissance',
    author: AUTHORS[1],
    cover: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80',
    category: 'Novels',
    categorySlug: 'novels',
    genre: 'Thriller',
    genreSlug: 'thriller',
    tags: ['Atmospheric', 'Cold War', 'Surveillance', 'Architecture', 'Exile'],
    language: 'English',
    status: 'Ongoing',
    visibility: 'Public',
    isMature: false,
    featured: true,
    trending: true,
    editorPick: true,
    synopsis: 'Stationed at an decommissioned radar observatory along the 64th parallel, archivist David Miller discovers that intercepted signals from thirty years ago are matching today’s satellite positions with mathematical perfection.',
    fullDescription: 'The Cold Perimeter is an exploration of memory, institutional complicity, and high-latitude isolation. When civil communication engineer David Miller arrives at Station Nine—a monolithic concrete bunker built during the height of early satellite telemetry—he expects months of uninterrupted clerical reconciliation. Instead, within the subterranean magnetic tape vaults, he uncovers encrypted dispatch transcripts that predict diplomatic movements twenty days before they occur in Geneva. As the perimeter fencing begins recording unlogged seismic tremors and perimeter lights flicker at precisely 03:14 every morning, Miller must decide whether the voice transmitting through the parabolic array belongs to a forgotten intelligence asset or an autonomous system whose creators have long vanished.',
    chaptersCount: 16,
    publishedChaptersCount: 14,
    totalReads: '482K',
    totalSaves: 18450,
    ratingScore: 4.9,
    ratingCount: 3820,
    createdAt: '2025-08-12',
    updatedAt: 'Yesterday',
    chapters: [
      {
        id: 'ch-1',
        number: 1,
        title: 'The Concrete Meridian',
        subtitle: 'Arrival at Station Nine',
        status: 'published',
        wordCount: 3420,
        readTimeMinutes: 14,
        publishedAt: 'Aug 14, 2025',
        content: `The helicopter blades were already slowing when the wheels made contact with the salt-crusted tarmac. Through the scratched plexiglass of the passenger cabin, Station Nine looked less like a manned research post and more like a slab of grey basalt sheared off the mountain by an ancient avalanche.

There were no trees. Above the sixty-fourth parallel, the earth abandons ornamentation. Only lichen clung to the volcanic scree, yellowish-grey, like dried tallow on cold iron.

David Miller set his duffel bag onto the damp aggregate. The wind came off the gulf without warning—cold, flat, smelling of brine and diesel exhaust. A man in a heavy shearling coat was waiting beside the fuel bunker, his hands buried deep within his pockets, a canvas cap pulled down to the bridge of his brow.

"You're late by two tides," the man said as David approached. His voice had the dry rasp of someone who spent forty days at a time speaking only to maintenance logs.

"The headwind over Tromsø held the transit flight," David replied, squinting against the spray. "Are you Keller?"

"I was Keller when the contract was signed," the man said, turning toward the heavy steel doorway recessed into the cliffside. "Now I am simply the person who hands you the brass keys and catches the return rotor. Leave the duffel by the compressor hatch; the boy will haul it to Level Three."

Inside the tunnel, the temperature dropped four degrees before rising again, thick with the dry mineral heat of steam radiators. Fluorescent tubes hummed overhead at sixty cycles, casting long, clean rectangles against the damp board-formed concrete.

"The manifest listed seventeen civil technicians," David noted, consulting the leather-bound ledger tucked beneath his arm. "The platform seems deserted."

Keller stopped at the entrance to the elevator cage. He looked back over his shoulder, his gray eyes narrowing in the artificial glare.

"The manifest is forty months old, Mr. Miller. In this sector, things do not stay staffed. They evaporate quietly. The telemetry runs on relays; the relays run on diesel; and diesel arrives every six weeks unless the ice closes the fiord. If you came looking for conversation, you brought the wrong training."

David stepped into the cage. The iron gate clattered shut with the sound of a rifle bolt chambering a round. As the hydraulic piston groaned into motion, descending past layers of damp granite, David smelled the first trace of ozone—sharp, metallic, unmistakably the scent of powered vacuum tubes and high-voltage transmission lines that had not cooled since 1974.`
      },
      {
        id: 'ch-2',
        number: 2,
        title: 'Signal in the Static',
        subtitle: 'Decoded telemetry from Sector 4',
        status: 'published',
        isNew: true,
        wordCount: 4180,
        readTimeMinutes: 17,
        publishedAt: 'Yesterday',
        content: `At twenty minutes past three in the morning, the console in Room 14 began its sequence.

It was not an alarm. Station Nine had no klaxons for irregularities—only a quiet solenoid that engaged behind the brass indicator plate, dropping a white celluloid tag into view behind the beveled glass window.

David had been reading an unclassified meteorological survey from the previous spring. The quiet *clack* of the solenoid cut through the droning hum of the ventilation shaft like a knife through grease.

He set his mug down on the blotter. The coffee had grown lukewarm and bitter, rimmed with a pale skim of condensed evaporated milk.

He walked across the parquet flooring, his wool socks silent against the oiled oak. In the third row of instrument racks, beneath the stencil that read *TRANSIT TELEMETRY — NON-CIVILIAN*, the white tag hung suspended: **CHANNEL 04 / FREQUENCY 812.44 MHz**.

That frequency had been decommissioned under the Helsinki Maritime Accords nineteen years ago. No transmitter in the Scandinavian corridor had clearance to modulate within twenty megahertz of that band.

David pulled the carbon headset over his ears. He turned the vernier dial three millimeters counterclockwise to center the needle on the phosphor dial.

First, there was only the sea noise—the cosmic background hiss of solar wind breaking against the ionosphere, a sound like dry oats pouring through a copper funnel.

Then came the cadence.

Not Morse. Not standard Baudot teleprinter code. It was a ternary pulse: three intervals of differing duration, followed by a dead-stop of exactly nine seconds.

David adjusted the stylus on the drum recorder. The carbon paper beneath the needle was fresh. The needle began to jump, scratching jagged black parabolas into the wax surface.

*One. Three. Seven. Space. One. Three. Seven. Space.*

He leaned in closer. The ink was clear. But beneath the cadence, embedded in the harmonic bleed of the carrier wave, someone was breathing.

It was the measured, rhythmic breath of an individual sitting in a room no larger than this one, their microphone key locked open, exhaling at twelve breaths per minute into the arctic night.`
      },
      {
        id: 'ch-3',
        number: 3,
        title: 'The Subterranean Vaults',
        subtitle: 'Unregistered magnetic archives',
        status: 'published',
        wordCount: 3890,
        readTimeMinutes: 16,
        publishedAt: 'Sep 28, 2025',
        content: `Level Four was not marked on the station blueprints that David had signed for in Oslo.

The stairway continued down past the mechanical rooms, behind a fire damper that had been painted over so many times the seam had disappeared into the lime-wash wall. David had only found the latch because the draft pulling under the threshold was cold enough to frost the tips of his work boots.

The key on the third brass ring turned with a dry, grinding resistance. Inside, the air smelled of vinegar—the unmistakable decomposition of cellulose acetate film stock.

A corridor eighty meters long stretched into the belly of the bedrock. On either side, steel shelving rose from floor to ceiling, stacked with olive-drab canisters, each labeled with stenciled white alphanumeric codes: *ARC-72-B*, *ARC-73-A*, *ARC-73-C*.

David pulled on a pair of white cotton gloves from his coat pocket. He pulled down the canister marked *ARC-74-DELTA*.

The seal had never been broken. The lead wire with the official customs stamp was intact.

He snapped the wire with his pocket shears and unscrewed the wingnuts. Inside, nested in oiled paper, was a spool of half-inch magnetic tape and a handwritten logbook with an embossed blue linen cover.

He opened the book to the first entry.

The handwriting was compact, slanting sharply to the right, executed with an engineer’s drafting pen.

*14 October 1974. Signal acquisition confirmed at 03:14. Coordinates match the trajectory of Cosmos-690. However, the modulation contains human phonetic markers in an unidentified dialect. We have attempted to notify the Admiralty Board. No acknowledgment received. Orders remain: record, seal, shelve.*

David turned the page. The entries continued for five years, night after night, in the exact same pen, in the exact same hand.

The last entry was dated two weeks ago.`
      },
      {
        id: 'ch-4',
        number: 4,
        title: 'The Perimeter Line',
        subtitle: 'Footprints in the frost',
        status: 'published',
        wordCount: 3600,
        readTimeMinutes: 15,
        publishedAt: 'Sep 20, 2025',
        content: `At dawn, the sun made only a brief, anemic gesture above the eastern headland—a lemon-colored smudge against bruised violet clouds that never truly cleared the horizon.

David stepped through the exterior airlock, his parka zipped to the chin. The cold hit like a physical blow, seizing the moisture inside his nostrils.

He carried a handheld induction detector and a pair of field binoculars. The perimeter wire ran for four kilometers along the spine of the ridge, marking the boundary of the military concession.

Halfway to Tower Three, where the cliffs plunged four hundred meters into the black water of the fiord, the wire hung slack.

David knelt in the crusted snow. The four strands of galvanized steel had not snapped under the wind; they had been cut cleanly with hydraulic bolt cutters. The metal ends were bright and unoxidized.

Beside the breach, clear in the blue morning light, were footprints.

They came up from the cliff face—an impossible ascent over sheer, ice-sheathed granite where even gulls refused to nest. They crossed the wire, paused for several paces beside the surveyor’s cairn, and then turned toward Station Nine's diesel exhaust vents.

David raised the binoculars. On the observation catwalk three hundred meters above him, silhouette against the pale sky, stood a figure.

It was not Keller. Keller had boarded the helicopter twelve hours ago.

The figure was holding a hand-wound transit compass, aiming it directly down at where David knelt in the snow.`
      }
    ]
  },
  {
    id: 'work-2',
    title: 'A Winter in Kyoto',
    subtitle: 'Selected Essays on Transit, Rain, and Solitude',
    author: AUTHORS[2],
    cover: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=80',
    category: 'Essays',
    categorySlug: 'essays',
    genre: 'Literary',
    genreSlug: 'literary',
    tags: ['Kyoto', 'Solitude', 'Architecture', 'Travel', 'Meditation'],
    language: 'English',
    status: 'Completed',
    visibility: 'Public',
    isMature: false,
    featured: true,
    trending: false,
    editorPick: true,
    synopsis: 'A suite of twelve quiet essays examining the geometry of night trains, temple eaves in heavy snowfall, and the peculiar dignity of eating alone in twenty-four-hour ramen stalls along the Kamo River.',
    fullDescription: 'In A Winter in Kyoto, Kenji Takahashi returns to the city of his grandfather’s youth after twelve years in Western Europe. Rather than a tourist memoir, this work functions as an architectural and philosophical meditation on how physical spaces govern human emotion. From the rhythmic cadence of the Hankyu line crossing the Katsura River at midnight to the silence of woodblock printshops tucked into narrow alleys off Kawaramachi, Takahashi chronicles the art of voluntary isolation and the rediscovery of attentiveness.',
    chaptersCount: 12,
    publishedChaptersCount: 12,
    totalReads: '215K',
    totalSaves: 12400,
    ratingScore: 4.95,
    ratingCount: 1890,
    createdAt: '2025-01-10',
    updatedAt: '3 weeks ago',
    chapters: [
      {
        id: 'ch-201',
        number: 1,
        title: 'The Hankyu Line at Midnight',
        subtitle: 'The geometry of train car interiors',
        status: 'published',
        wordCount: 2200,
        readTimeMinutes: 9,
        publishedAt: 'Jan 10, 2025',
        content: `There is a particular olive-green velvet used on the upholstery of the Hankyu railway cars that has not changed in seventy years. It absorbs light rather than reflecting it, so that even under the fluorescent tubes of the midnight express out of Umeda, the interior retains the hushed atmosphere of a private study.

Passengers do not speak. They do not merely refrain from speaking; they practice a communal withholding of sound. Newspapers are folded with surgical origami into sixths so as not to graze an adjacent shoulder. Umbrella tips are rested precisely between one’s own shoe leather, catching drips on rubber mats.

To ride this train when the rain turns to sleet outside the window is to witness a civilization that values spatial courtesy above individual declaration.`
      },
      {
        id: 'ch-202',
        number: 2,
        title: 'Rain on Cedar Shingles',
        subtitle: 'Acoustics of the northern temples',
        status: 'published',
        wordCount: 2800,
        readTimeMinutes: 11,
        publishedAt: 'Jan 18, 2025',
        content: `The cedar shingle roof does not deflect rain; it welcomes it into its fibers. Unlike modern tile or corrugated zinc, which turns rainfall into percussion, untreated cryptomeria cedar softens every strike into a low, muffled murmur, like distant kettle drums wrapped in felt.

I sat on the veranda of Honen-in for three hours watching the moss garden drink. In winter, the moss takes on a darker, almost metallic green, resilient beneath the sleet.

There is no lesson to be drawn from this, except that quietness is not the absence of energy; it is the presence of an architecture that refuses to panic.`
      }
    ]
  },
  {
    id: 'work-3',
    title: 'The Bureaucracy of Miracles',
    subtitle: 'Dispatches from the Department of Unverifiable Occurrences',
    author: AUTHORS[3],
    cover: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80',
    category: 'Fiction',
    categorySlug: 'fiction',
    genre: 'Philosophy',
    genreSlug: 'philosophy',
    tags: ['Satire', 'Borges', 'Bureaucracy', 'Magic Realism', 'Subtle'],
    language: 'English',
    status: 'Ongoing',
    visibility: 'Public',
    isMature: false,
    featured: false,
    trending: true,
    rising: true,
    synopsis: 'In an unnamed Central European capital, civil servants in Sub-Ministry 4 are tasked with cataloging events that violate Newtonian physics—not to investigate them, but to ensure they comply with local municipal tax codes.',
    fullDescription: 'When a stained-glass window in a municipal tram depot begins refracting light into nonexistent spectra, it is not referred to the Academy of Sciences. It is routed to Section 18-C of the Directorate of Records. Soren Vance crafts a dazzling, understated examination of human order confronting the incomprehensible. With dry humor and bureaucratic precision reminiscent of Kafka and Borges, the novel follows Inspector Arthur Klein as he audits levitating park benches, weeping cadastral maps, and an archivist who discovers an extra Tuesday in every leap year.',
    chaptersCount: 9,
    publishedChaptersCount: 8,
    totalReads: '168K',
    totalSaves: 9400,
    ratingScore: 4.85,
    ratingCount: 1420,
    createdAt: '2025-06-04',
    updatedAt: '4 days ago',
    chapters: [
      {
        id: 'ch-301',
        number: 1,
        title: 'Form 104-B (Unsolicited Transmutation)',
        subtitle: 'Concerning the copper pipes in Alley 7',
        status: 'published',
        wordCount: 2950,
        readTimeMinutes: 12,
        publishedAt: 'Jun 05, 2025',
        content: `The primary difficulty with miracles, Arthur Klein often explained to junior inspectors, was never theological. It was fiscal.

When the municipal fountain in the Place des Orfèvres ran with pale Rhine wine for forty-five minutes on an unseasonably warm Thursday afternoon in October, the Archbishop declared it a sign of divine favor. The Ministry of Sanitation declared it an unapproved organic contaminant. But the Department of Revenue pointed out that ninety-eight liters of alcohol had been consumed without excise stamps, representing a net loss to the public treasury of four hundred and twelve guilders.

Klein arrived with his brass calipers and three reams of manifold carbon paper.`
      }
    ]
  },
  {
    id: 'work-4',
    title: 'The Cartographer of Lost Ships',
    subtitle: 'A Maritime Investigation',
    author: AUTHORS[0],
    cover: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=800&q=80',
    category: 'Creative Non-Fiction',
    categorySlug: 'creative-non-fiction',
    genre: 'Historical',
    genreSlug: 'historical',
    tags: ['Maritime', 'Navigation', 'Shipwrecks', 'Cartography', 'History'],
    language: 'English',
    status: 'Completed',
    visibility: 'Public',
    isMature: false,
    featured: true,
    trending: false,
    editorPick: false,
    synopsis: 'Following the trail of 19th-century naval surveyor Robert MacIntyre, who deliberately drew nonexistent shoals on nautical charts to prevent whaling vessels from entering sacred Hebridean sanctuaries.',
    fullDescription: 'Drawing from newly unsealed admiralty records in Greenock and private diaries kept in the Outer Hebrides, Julian Montgomery reconstructs the extraordinary defiance of Robert MacIntyre. Appointed in 1848 to map the treacherous Minch waterways for commercial exploitation, MacIntyre invented mythical reefs, ghost currents, and phantom sandbars—saving countless cetacean breeding grounds while confusing generations of naval captains.',
    chaptersCount: 10,
    publishedChaptersCount: 10,
    totalReads: '340K',
    totalSaves: 15900,
    ratingScore: 4.92,
    ratingCount: 2910,
    createdAt: '2024-11-20',
    updatedAt: '2 months ago',
    chapters: [
      {
        id: 'ch-401',
        number: 1,
        title: 'The Shoal of St. Jude',
        subtitle: 'Ink where there is only deep water',
        status: 'published',
        wordCount: 3100,
        readTimeMinutes: 13,
        publishedAt: 'Nov 20, 2024',
        content: `On Admiralty Chart 2471, published under the authority of the Hydrographic Office in London, there is a cluster of black crosses marked *St. Jude’s Reef — Break at Low Water*.

For eighty years, merchant steamers running coal between Cardiff and the Baltic gave that quadrant of the Minch a wide berth of twelve nautical miles. No captain wished to test his hull on jagged Lewisian gneiss in a westerly gale.

Yet when acoustic depth sounders were first dragged through those waters in the summer of 1938, the bottom showed eighty fathoms of pristine sand. There was no reef. There had never been a reef.

There had only been Robert MacIntyre, a brass ruling pen, and an unbreakable vow made to the seals of the Monach Isles.`
      }
    ]
  },
  {
    id: 'work-5',
    title: 'Notes on Subarctic Light',
    subtitle: 'Poems from the 69th Parallel',
    author: AUTHORS[4],
    cover: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&w=800&q=80',
    category: 'Poetry',
    categorySlug: 'poetry',
    genre: 'Literary',
    genreSlug: 'literary',
    tags: ['Poetry', 'Arctic', 'Light', 'Silence', 'Landscape'],
    language: 'English',
    status: 'Completed',
    visibility: 'Public',
    isMature: false,
    featured: false,
    trending: false,
    rising: true,
    synopsis: 'A sequence of forty-eight minimalist poems tracking the sixty days of polar night in Tromsø, where light ceases to be an illumination and becomes a memory held inside granite.',
    fullDescription: 'Mara Lindqvist’s verse moves with the austere clarity of Scandinavian woodcuts. Here are poems stripped of rhetoric, attending strictly to the textures of rime ice, the sound of cod lines pulling taut through black water, and the strange, quiet solidarity of neighbors who greet each other with head nods in perpetual twilight.',
    chaptersCount: 5,
    publishedChaptersCount: 5,
    totalReads: '92K',
    totalSaves: 5800,
    ratingScore: 4.96,
    ratingCount: 840,
    createdAt: '2025-02-14',
    updatedAt: '1 month ago',
    chapters: [
      {
        id: 'ch-501',
        number: 1,
        title: 'Canto I: First Absence',
        subtitle: 'The sun drops below the Lyngen Alps',
        status: 'published',
        wordCount: 850,
        readTimeMinutes: 4,
        publishedAt: 'Feb 14, 2025',
        content: `The mountain took the sun today
like a coin slipped into a dead man's pocket.

No ceremony.
Only the blue kerosene hue of snow
that forgot it had ever been water.

We turn on the kitchen lamp at noon.
The moth outside the double pane
does not know the difference
between noon and death.`
      }
    ]
  },
  {
    id: 'work-6',
    title: 'The Redacted Script',
    subtitle: 'A Screenplay in Three Interrogations',
    author: AUTHORS[1],
    cover: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=800&q=80',
    category: 'Scripts',
    categorySlug: 'scripts',
    genre: 'Mystery',
    genreSlug: 'mystery',
    tags: ['Screenplay', 'Noir', 'Interrogation', 'Vienna', 'Cinema'],
    language: 'English',
    status: 'Ongoing',
    visibility: 'Public',
    isMature: true,
    featured: false,
    trending: true,
    rising: false,
    synopsis: 'Set in occupied Vienna in 1948, a film censor is tasked with determining why five identical reels of film were smuggled out of the Soviet sector with every face cut out with an exacto blade.',
    fullDescription: 'Written in disciplined screenplay format with literary scene descriptions, The Redacted Script puts the reader directly in the projector booth of the Apollo Theater. When censor Heinrich Brandt runs the mysterious nitrate reels, he discovers that the empty silhouettes left by the blade correspond to living people who disappeared from their apartments forty-eight hours after the film was shot.',
    chaptersCount: 6,
    publishedChaptersCount: 4,
    totalReads: '124K',
    totalSaves: 7100,
    ratingScore: 4.88,
    ratingCount: 1110,
    createdAt: '2025-07-02',
    updatedAt: '1 week ago',
    chapters: [
      {
        id: 'ch-601',
        number: 1,
        title: 'Scene 1: The Nitrate Cellar',
        subtitle: 'Vienna, October 1948',
        status: 'published',
        wordCount: 2400,
        readTimeMinutes: 10,
        publishedAt: 'Jul 02, 2025',
        content: `INT. APOLLO KINO - PROJECTION BOOTH - NIGHT

A cigarette burns in an enameled saucer. Grey smoke drifts into the beam of carbon-arc light.

The projector CHATTERS. Thirty-five millimeter nitrate film whips through the gate at twenty-four frames per second.

HEINRICH BRANDT (48), wearing a threadbare wool suit and round steel-rimmed spectacles, sits on a high drafting stool. His hands rest on the rewinder crank.

ON SCREEN:
A silent street in the Leopoldstadt. Cobblestones wet with rain. A woman in a dark tailored overcoat steps out of a bakery doorway.

EXCEPT HER FACE IS GONE.

In place of her features, there is an oval void—cut out with razor sharpness directly from the photographic emulsion. Through the hole, the pure white arc lamp projects onto the cinema wall.

Brandt reaches out. He stops the motor with the brass handbrake.

The film frame FREEZES. Heat from the lamp begins to blister the acetate around the oval.

BRANDT
(quietly, to himself)
She was alive on Tuesday.`
      }
    ]
  },
  {
    id: 'work-7',
    title: 'The Long Apprenticeship',
    subtitle: 'A Personal Narrative of Printing, Lead, and Patience',
    author: AUTHORS[0],
    cover: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80',
    category: 'Personal Narratives',
    categorySlug: 'personal-narratives',
    genre: 'Literary',
    genreSlug: 'literary',
    tags: ['Letterpress', 'Typography', 'Apprenticeship', 'Memoir', 'Craft'],
    language: 'English',
    status: 'Completed',
    visibility: 'Public',
    isMature: false,
    featured: false,
    trending: false,
    rising: false,
    synopsis: 'Seven years spent in a small letterpress workshop in the backstreets of Leith, learning the physical weight of lead type, the behavior of Dutch inks, and the disappearing discipline of setting words by hand.',
    fullDescription: 'Before books became digital streams of pixels, they were physical sculptures of lead and ink cast under hydraulic pressure. Julian Montgomery recounts his years under the exacting eye of master compositor Donald MacLean, who taught him that an extra point of line-spacing could alter the emotional cadence of a sentence more effectively than any adjective.',
    chaptersCount: 8,
    publishedChaptersCount: 8,
    totalReads: '178K',
    totalSaves: 10200,
    ratingScore: 4.91,
    ratingCount: 1530,
    createdAt: '2024-09-15',
    updatedAt: '3 months ago',
    chapters: [
      {
        id: 'ch-701',
        number: 1,
        title: 'The California Job Case',
        subtitle: 'The topography of lead letters',
        status: 'published',
        wordCount: 2600,
        readTimeMinutes: 11,
        publishedAt: 'Sep 15, 2024',
        content: `A compositor does not look at the letters when he sets type. His eyes remain fixed on the manuscript copy pinned to the visor of his composing stick. His right hand moves across the wooden compartments of the California Job Case like a pianist’s fingers across keys he has known since childhood.

The letter 'e' lives in the largest compartment, right in the center, worn smooth by a hundred thousand thumb movements. The 'q' and 'x' are tucked into small bins in the upper corner, cold and rarely visited.

Donald MacLean would stand behind me with a folded rule in his fist. If my hand hesitated for more than half a breath over the compartment for the lowercase 'h', the rule would tap against the rim of my composing stick.

"You're not searching for an idea, Montgomery," he would say in that low Highland rumble. "The idea is already written. You are simply giving it iron teeth."`
      }
    ]
  },
  {
    id: 'work-8',
    title: 'The Starlight Clockmaker',
    subtitle: 'A Tale for Young Observers',
    author: AUTHORS[4],
    cover: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=800&q=80',
    category: "Children's Stories",
    categorySlug: 'childrens-stories',
    genre: 'Fantasy',
    genreSlug: 'fantasy',
    tags: ['Children', 'Fairytale', 'Astronomy', 'Horology', 'Wonder'],
    language: 'English',
    status: 'Completed',
    visibility: 'Public',
    isMature: false,
    featured: false,
    trending: false,
    rising: false,
    synopsis: 'High in the bell tower of the Northern Observatory lives Tobias, who winds the clock that makes the constellations turn so the polar bears know when it is time to sleep.',
    fullDescription: 'Crafted with timeless lyricism and gentle illustrations in mind, The Starlight Clockmaker is an imaginative bedtime fable celebrating curiosity, craftsmanship, and the quiet beauty of the night sky.',
    chaptersCount: 4,
    publishedChaptersCount: 4,
    totalReads: '84K',
    totalSaves: 4900,
    ratingScore: 4.97,
    ratingCount: 720,
    createdAt: '2024-12-01',
    updatedAt: '4 months ago',
    chapters: [
      {
        id: 'ch-801',
        number: 1,
        title: 'The Great Brass Key',
        subtitle: 'Winding the midnight gears',
        status: 'published',
        wordCount: 1600,
        readTimeMinutes: 7,
        publishedAt: 'Dec 01, 2024',
        content: `Every evening when the village below turned off its hearth fires, Tobias climbed seventy-two winding stone steps to the very peak of the clock tower.

He did not carry a candle, because when your eyes know every step by heart, a candle only gets in the way of seeing the stars.

In his pocket was a key cast from meteor iron—heavy, cool to the touch, and smelling faintly of silver rain.`
      }
    ]
  }
]

export const FEED_EVENTS: FeedEvent[] = [
  {
    id: 'feed-1',
    type: 'chapter_release',
    author: AUTHORS[1],
    work: {
      id: WORKS[0].id,
      title: WORKS[0].title,
      cover: WORKS[0].cover,
      category: WORKS[0].category,
      genre: WORKS[0].genre,
    },
    chapter: {
      id: 'ch-2',
      number: 2,
      title: 'Signal in the Static',
    },
    timestamp: '3 hours ago',
    note: 'Elena Rostova published Chapter 2 of The Cold Perimeter. 4,180 words.'
  },
  {
    id: 'feed-2',
    type: 'new_work',
    author: AUTHORS[3],
    work: {
      id: WORKS[2].id,
      title: WORKS[2].title,
      cover: WORKS[2].cover,
      category: WORKS[2].category,
      genre: WORKS[2].genre,
    },
    timestamp: 'Yesterday',
    note: 'Soren Vance published a new serialized philosophical fiction: The Bureaucracy of Miracles.'
  },
  {
    id: 'feed-3',
    type: 'milestone',
    author: AUTHORS[0],
    work: {
      id: WORKS[3].id,
      title: WORKS[3].title,
      cover: WORKS[3].cover,
      category: WORKS[3].category,
      genre: WORKS[3].genre,
    },
    timestamp: '3 days ago',
    note: 'The Cartographer of Lost Ships reached 300,000 readers.'
  },
  {
    id: 'feed-4',
    type: 'chapter_release',
    author: AUTHORS[2],
    work: {
      id: WORKS[1].id,
      title: WORKS[1].title,
      cover: WORKS[1].cover,
      category: WORKS[1].category,
      genre: WORKS[1].genre,
    },
    chapter: {
      id: 'ch-202',
      number: 2,
      title: 'Rain on Cedar Shingles',
    },
    timestamp: '5 days ago',
    note: 'Kenji Takahashi added Chapter 2 to A Winter in Kyoto.'
  }
]

export const INITIAL_COMMENTS: CommentItem[] = [
  {
    id: 'comm-1',
    workId: 'work-1',
    chapterId: 'ch-1',
    authorName: 'Claire Beaumont',
    authorHandle: 'cbeaumont',
    authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
    content: 'The description of Station Nine as a "slab of grey basalt sheared off the mountain" immediately sets the psychological claustrophobia. The pacing here is remarkably confident.',
    timestamp: '2 days ago',
    likesCount: 38,
    replies: [
      {
        id: 'comm-1-1',
        workId: 'work-1',
        chapterId: 'ch-1',
        authorName: 'Elena Rostova',
        authorHandle: 'elena_rostova',
        authorAvatar: AUTHORS[1].avatar,
        isWorkAuthor: true,
        content: 'Thank you, Claire. I spent three weeks researching the architectural drawings of NATO listening posts built in Finnmark between 1968 and 1974. The board-formed concrete details are accurate to that era.',
        timestamp: '1 day ago',
        likesCount: 19
      }
    ]
  },
  {
    id: 'comm-2',
    workId: 'work-1',
    chapterId: 'ch-1',
    authorName: 'Arthur Vance',
    authorHandle: 'avance_arch',
    authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
    content: 'The line "If you came looking for conversation, you brought the wrong training" is pure gold. Excited to follow this serialized dispatch.',
    timestamp: '3 days ago',
    likesCount: 14
  }
]

export interface WriterWorkSummary {
  id: string
  title: string
  cover: string
  status: 'Published' | 'Draft' | 'Archived'
  chaptersCount: number
  totalReads: string
  totalSaves: number
  lastUpdated: string
  category: string
}

export const USER_WRITER_WORKS: WriterWorkSummary[] = [
  {
    id: 'writer-work-1',
    title: 'The Silent Meridian',
    cover: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=600&q=80',
    status: 'Published',
    chaptersCount: 18,
    totalReads: '124.5K',
    totalSaves: 4820,
    lastUpdated: '2 hours ago',
    category: 'Novels'
  },
  {
    id: 'writer-work-2',
    title: 'An Inventory of Baltic Fog',
    cover: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=600&q=80',
    status: 'Published',
    chaptersCount: 6,
    totalReads: '38.2K',
    totalSaves: 1290,
    lastUpdated: '4 days ago',
    category: 'Essays'
  },
  {
    id: 'writer-work-3',
    title: 'The Telegrapher’s Granddaughter',
    cover: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=600&q=80',
    status: 'Draft',
    chaptersCount: 3,
    totalReads: '0',
    totalSaves: 0,
    lastUpdated: 'Yesterday',
    category: 'Historical'
  }
]

export interface NotificationItem {
  id: string
  type: 'publish' | 'update' | 'comment' | 'milestone'
  actorName: string
  actorAvatar: string
  title: string
  description: string
  targetUrl: string
  timestamp: string
  isRead: boolean
}

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    type: 'update',
    actorName: 'Elena Rostova',
    actorAvatar: AUTHORS[1].avatar,
    title: 'Chapter 2 released',
    description: 'Elena published "Signal in the Static" for The Cold Perimeter.',
    targetUrl: '/read/work-1/ch-2',
    timestamp: '2 hours ago',
    isRead: false
  },
  {
    id: 'notif-2',
    type: 'comment',
    actorName: 'Claire Beaumont',
    actorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
    title: 'New comment on your work',
    description: 'Left a note on Chapter 1 of The Silent Meridian: "Remarkable atmosphere..."',
    targetUrl: '/read/work-1/ch-1',
    timestamp: '1 day ago',
    isRead: false
  },
  {
    id: 'notif-3',
    type: 'publish',
    actorName: 'Soren Vance',
    actorAvatar: AUTHORS[3].avatar,
    title: 'New work published',
    description: 'Soren released a new serialized work: The Bureaucracy of Miracles.',
    targetUrl: '/works/work-3',
    timestamp: '3 days ago',
    isRead: true
  },
  {
    id: 'notif-4',
    type: 'milestone',
    actorName: 'Relay Stories',
    actorAvatar: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=150&q=80',
    title: 'Editorial Selection',
    description: 'Your essay "An Inventory of Baltic Fog" was featured in Editor’s Picks.',
    targetUrl: '/works/work-2',
    timestamp: '1 week ago',
    isRead: true
  }
]
