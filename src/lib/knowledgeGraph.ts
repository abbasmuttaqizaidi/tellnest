/**
 * HatchPen Knowledge Graph & Wikidata Entity Mapping
 *
 * Maps HatchPen canonical taxonomy (Categories, Genres, Tropes/Themes) to authoritative
 * Wikidata and Wikipedia entity IDs for Google Knowledge Graph, AI search engines (Perplexity,
 * Copilot, ChatGPT Search), and Schema.org `sameAs` entity resolution.
 */

export interface KnowledgeEntity {
  slug: string
  name: string
  wikidataId?: string
  wikidataUrl?: string
  wikipediaUrl?: string
  sameAs: string[]
}

/**
 * 17 Canonical Category Knowledge Graph Entities
 */
export const CATEGORY_KNOWLEDGE_GRAPH: Record<string, KnowledgeEntity> = {
  novels: {
    slug: 'novels',
    name: 'Novels',
    wikidataId: 'Q8261',
    wikidataUrl: 'https://www.wikidata.org/wiki/Q8261',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Novel',
    sameAs: ['https://www.wikidata.org/wiki/Q8261', 'https://en.wikipedia.org/wiki/Novel'],
  },
  'short-stories': {
    slug: 'short-stories',
    name: 'Short Stories',
    wikidataId: 'Q24862',
    wikidataUrl: 'https://www.wikidata.org/wiki/Q24862',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Short_story',
    sameAs: ['https://www.wikidata.org/wiki/Q24862', 'https://en.wikipedia.org/wiki/Short_story'],
  },
  'flash-fiction': {
    slug: 'flash-fiction',
    name: 'Flash Fiction',
    wikidataId: 'Q1427234',
    wikidataUrl: 'https://www.wikidata.org/wiki/Q1427234',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Flash_fiction',
    sameAs: ['https://www.wikidata.org/wiki/Q1427234', 'https://en.wikipedia.org/wiki/Flash_fiction'],
  },
  'serialized-fiction': {
    slug: 'serialized-fiction',
    name: 'Serialized Fiction',
    wikidataId: 'Q1059530',
    wikidataUrl: 'https://www.wikidata.org/wiki/Q1059530',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Serial_(literature)',
    sameAs: ['https://www.wikidata.org/wiki/Q1059530', 'https://en.wikipedia.org/wiki/Serial_(literature)'],
  },
  poetry: {
    slug: 'poetry',
    name: 'Poetry',
    wikidataId: 'Q5185',
    wikidataUrl: 'https://www.wikidata.org/wiki/Q5185',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Poetry',
    sameAs: ['https://www.wikidata.org/wiki/Q5185', 'https://en.wikipedia.org/wiki/Poetry'],
  },
  essays: {
    slug: 'essays',
    name: 'Essays',
    wikidataId: 'Q35760',
    wikidataUrl: 'https://www.wikidata.org/wiki/Q35760',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Essay',
    sameAs: ['https://www.wikidata.org/wiki/Q35760', 'https://en.wikipedia.org/wiki/Essay'],
  },
  'non-fiction': {
    slug: 'non-fiction',
    name: 'Non‑Fiction',
    wikidataId: 'Q228012',
    wikidataUrl: 'https://www.wikidata.org/wiki/Q228012',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Non-fiction',
    sameAs: ['https://www.wikidata.org/wiki/Q228012', 'https://en.wikipedia.org/wiki/Non-fiction'],
  },
  'memoir-autobiography': {
    slug: 'memoir-autobiography',
    name: 'Memoir / Autobiography',
    wikidataId: 'Q4184',
    wikidataUrl: 'https://www.wikidata.org/wiki/Q4184',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Memoir',
    sameAs: ['https://www.wikidata.org/wiki/Q4184', 'https://en.wikipedia.org/wiki/Memoir'],
  },
  'childrens-fiction': {
    slug: 'childrens-fiction',
    name: 'Children’s Fiction',
    wikidataId: 'Q131539',
    wikidataUrl: 'https://www.wikidata.org/wiki/Q131539',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Children%27s_literature',
    sameAs: ['https://www.wikidata.org/wiki/Q131539', 'https://en.wikipedia.org/wiki/Children%27s_literature'],
  },
  'middle-grade': {
    slug: 'middle-grade',
    name: 'Middle Grade',
    wikidataId: 'Q131539',
    wikidataUrl: 'https://www.wikidata.org/wiki/Q131539',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Middle_grade_fiction',
    sameAs: ['https://www.wikidata.org/wiki/Q131539', 'https://en.wikipedia.org/wiki/Middle_grade_fiction'],
  },
  'young-adult-ya': {
    slug: 'young-adult-ya',
    name: 'Young Adult (YA)',
    wikidataId: 'Q1233720',
    wikidataUrl: 'https://www.wikidata.org/wiki/Q1233720',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Young_adult_fiction',
    sameAs: ['https://www.wikidata.org/wiki/Q1233720', 'https://en.wikipedia.org/wiki/Young_adult_fiction'],
  },
  'new-adult': {
    slug: 'new-adult',
    name: 'New Adult',
    wikidataId: 'Q17006886',
    wikidataUrl: 'https://www.wikidata.org/wiki/Q17006886',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/New-adult_fiction',
    sameAs: ['https://www.wikidata.org/wiki/Q17006886', 'https://en.wikipedia.org/wiki/New-adult_fiction'],
  },
  'fan-fiction': {
    slug: 'fan-fiction',
    name: 'Fan Fiction',
    wikidataId: 'Q182642',
    wikidataUrl: 'https://www.wikidata.org/wiki/Q182642',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Fan_fiction',
    sameAs: ['https://www.wikidata.org/wiki/Q182642', 'https://en.wikipedia.org/wiki/Fan_fiction'],
  },
  'anthologies-collections': {
    slug: 'anthologies-collections',
    name: 'Anthologies / Collections',
    wikidataId: 'Q105420',
    wikidataUrl: 'https://www.wikidata.org/wiki/Q105420',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Anthology',
    sameAs: ['https://www.wikidata.org/wiki/Q105420', 'https://en.wikipedia.org/wiki/Anthology'],
  },
  'graphic-novels-comics': {
    slug: 'graphic-novels-comics',
    name: 'Graphic Novels / Comics',
    wikidataId: 'Q725377',
    wikidataUrl: 'https://www.wikidata.org/wiki/Q725377',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Graphic_novel',
    sameAs: ['https://www.wikidata.org/wiki/Q725377', 'https://en.wikipedia.org/wiki/Graphic_novel'],
  },
  'scripts-screenplays': {
    slug: 'scripts-screenplays',
    name: 'Scripts / Screenplays',
    wikidataId: 'Q250346',
    wikidataUrl: 'https://www.wikidata.org/wiki/Q250346',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Screenplay',
    sameAs: ['https://www.wikidata.org/wiki/Q250346', 'https://en.wikipedia.org/wiki/Screenplay'],
  },
  'religion-spirituality': {
    slug: 'religion-spirituality',
    name: 'Religion & Spirituality',
    wikidataId: 'Q9174',
    wikidataUrl: 'https://www.wikidata.org/wiki/Q9174',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Spirituality',
    sameAs: ['https://www.wikidata.org/wiki/Q9174', 'https://en.wikipedia.org/wiki/Spirituality'],
  },
}

/**
 * 34 Canonical Genre Knowledge Graph Entities
 */
export const GENRE_KNOWLEDGE_GRAPH: Record<string, KnowledgeEntity> = {
  'literary-fiction': {
    slug: 'literary-fiction',
    name: 'Literary Fiction',
    wikidataId: 'Q2914187',
    wikidataUrl: 'https://www.wikidata.org/wiki/Q2914187',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Literary_fiction',
    sameAs: ['https://www.wikidata.org/wiki/Q2914187', 'https://en.wikipedia.org/wiki/Literary_fiction'],
  },
  'contemporary-fiction': {
    slug: 'contemporary-fiction',
    name: 'Contemporary Fiction',
    wikidataId: 'Q8261',
    wikidataUrl: 'https://www.wikidata.org/wiki/Q8261',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Contemporary_literature',
    sameAs: ['https://www.wikidata.org/wiki/Q8261', 'https://en.wikipedia.org/wiki/Contemporary_literature'],
  },
  'general-fiction': {
    slug: 'general-fiction',
    name: 'General Fiction',
    wikidataId: 'Q8253',
    wikidataUrl: 'https://www.wikidata.org/wiki/Q8253',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Fiction',
    sameAs: ['https://www.wikidata.org/wiki/Q8253', 'https://en.wikipedia.org/wiki/Fiction'],
  },
  thriller: {
    slug: 'thriller',
    name: 'Thriller',
    wikidataId: 'Q2484376',
    wikidataUrl: 'https://www.wikidata.org/wiki/Q2484376',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Thriller_(genre)',
    sameAs: ['https://www.wikidata.org/wiki/Q2484376', 'https://en.wikipedia.org/wiki/Thriller_(genre)'],
  },
  mystery: {
    slug: 'mystery',
    name: 'Mystery',
    wikidataId: 'Q186424',
    wikidataUrl: 'https://www.wikidata.org/wiki/Q186424',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Mystery_fiction',
    sameAs: ['https://www.wikidata.org/wiki/Q186424', 'https://en.wikipedia.org/wiki/Mystery_fiction'],
  },
  'psychological-thriller': {
    slug: 'psychological-thriller',
    name: 'Psychological Thriller',
    wikidataId: 'Q1195610',
    wikidataUrl: 'https://www.wikidata.org/wiki/Q1195610',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Psychological_thriller',
    sameAs: ['https://www.wikidata.org/wiki/Q1195610', 'https://en.wikipedia.org/wiki/Psychological_thriller'],
  },
  crime: {
    slug: 'crime',
    name: 'Crime',
    wikidataId: 'Q499871',
    wikidataUrl: 'https://www.wikidata.org/wiki/Q499871',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Crime_fiction',
    sameAs: ['https://www.wikidata.org/wiki/Q499871', 'https://en.wikipedia.org/wiki/Crime_fiction'],
  },
  'espionage-spy': {
    slug: 'espionage-spy',
    name: 'Espionage / Spy',
    wikidataId: 'Q1139446',
    wikidataUrl: 'https://www.wikidata.org/wiki/Q1139446',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Spy_fiction',
    sameAs: ['https://www.wikidata.org/wiki/Q1139446', 'https://en.wikipedia.org/wiki/Spy_fiction'],
  },
  'science-fiction': {
    slug: 'science-fiction',
    name: 'Science Fiction',
    wikidataId: 'Q24925',
    wikidataUrl: 'https://www.wikidata.org/wiki/Q24925',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Science_fiction',
    sameAs: ['https://www.wikidata.org/wiki/Q24925', 'https://en.wikipedia.org/wiki/Science_fiction'],
  },
  dystopian: {
    slug: 'dystopian',
    name: 'Dystopian',
    wikidataId: 'Q180592',
    wikidataUrl: 'https://www.wikidata.org/wiki/Q180592',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Dystopia',
    sameAs: ['https://www.wikidata.org/wiki/Q180592', 'https://en.wikipedia.org/wiki/Dystopia'],
  },
  cyberpunk: {
    slug: 'cyberpunk',
    name: 'Cyberpunk',
    wikidataId: 'Q174523',
    wikidataUrl: 'https://www.wikidata.org/wiki/Q174523',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Cyberpunk',
    sameAs: ['https://www.wikidata.org/wiki/Q174523', 'https://en.wikipedia.org/wiki/Cyberpunk'],
  },
  'space-opera': {
    slug: 'space-opera',
    name: 'Space Opera',
    wikidataId: 'Q4686',
    wikidataUrl: 'https://www.wikidata.org/wiki/Q4686',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Space_opera',
    sameAs: ['https://www.wikidata.org/wiki/Q4686', 'https://en.wikipedia.org/wiki/Space_opera'],
  },
  fantasy: {
    slug: 'fantasy',
    name: 'Fantasy',
    wikidataId: 'Q132311',
    wikidataUrl: 'https://www.wikidata.org/wiki/Q132311',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Fantasy',
    sameAs: ['https://www.wikidata.org/wiki/Q132311', 'https://en.wikipedia.org/wiki/Fantasy'],
  },
  'dark-fantasy': {
    slug: 'dark-fantasy',
    name: 'Dark Fantasy',
    wikidataId: 'Q844111',
    wikidataUrl: 'https://www.wikidata.org/wiki/Q844111',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Dark_fantasy',
    sameAs: ['https://www.wikidata.org/wiki/Q844111', 'https://en.wikipedia.org/wiki/Dark_fantasy'],
  },
  'magical-realism': {
    slug: 'magical-realism',
    name: 'Magical Realism',
    wikidataId: 'Q179201',
    wikidataUrl: 'https://www.wikidata.org/wiki/Q179201',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Magic_realism',
    sameAs: ['https://www.wikidata.org/wiki/Q179201', 'https://en.wikipedia.org/wiki/Magic_realism'],
  },
  horror: {
    slug: 'horror',
    name: 'Horror',
    wikidataId: 'Q193605',
    wikidataUrl: 'https://www.wikidata.org/wiki/Q193605',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Horror_fiction',
    sameAs: ['https://www.wikidata.org/wiki/Q193605', 'https://en.wikipedia.org/wiki/Horror_fiction'],
  },
  romance: {
    slug: 'romance',
    name: 'Romance',
    wikidataId: 'Q859341',
    wikidataUrl: 'https://www.wikidata.org/wiki/Q859341',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Romance_novel',
    sameAs: ['https://www.wikidata.org/wiki/Q859341', 'https://en.wikipedia.org/wiki/Romance_novel'],
  },
  'dark-romance': {
    slug: 'dark-romance',
    name: 'Dark Romance',
    wikidataId: 'Q859341',
    wikidataUrl: 'https://www.wikidata.org/wiki/Q859341',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Dark_romance',
    sameAs: ['https://www.wikidata.org/wiki/Q859341', 'https://en.wikipedia.org/wiki/Dark_romance'],
  },
  'contemporary-romance': {
    slug: 'contemporary-romance',
    name: 'Contemporary Romance',
    wikidataId: 'Q5164998',
    wikidataUrl: 'https://www.wikidata.org/wiki/Q5164998',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Contemporary_romance',
    sameAs: ['https://www.wikidata.org/wiki/Q5164998', 'https://en.wikipedia.org/wiki/Contemporary_romance'],
  },
  'historical-romance': {
    slug: 'historical-romance',
    name: 'Historical Romance',
    wikidataId: 'Q2615309',
    wikidataUrl: 'https://www.wikidata.org/wiki/Q2615309',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Historical_romance',
    sameAs: ['https://www.wikidata.org/wiki/Q2615309', 'https://en.wikipedia.org/wiki/Historical_romance'],
  },
  'lgbtq-romance': {
    slug: 'lgbtq-romance',
    name: 'LGBTQ+ Romance',
    wikidataId: 'Q2511114',
    wikidataUrl: 'https://www.wikidata.org/wiki/Q2511114',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Gay_romance',
    sameAs: ['https://www.wikidata.org/wiki/Q2511114', 'https://en.wikipedia.org/wiki/Gay_romance'],
  },
  'erotic-romance': {
    slug: 'erotic-romance',
    name: 'Erotic Romance',
    wikidataId: 'Q1361280',
    wikidataUrl: 'https://www.wikidata.org/wiki/Q1361280',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Erotic_romance',
    sameAs: ['https://www.wikidata.org/wiki/Q1361280', 'https://en.wikipedia.org/wiki/Erotic_romance'],
  },
  'paranormal-romance': {
    slug: 'paranormal-romance',
    name: 'Paranormal Romance',
    wikidataId: 'Q3363651',
    wikidataUrl: 'https://www.wikidata.org/wiki/Q3363651',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Paranormal_romance',
    sameAs: ['https://www.wikidata.org/wiki/Q3363651', 'https://en.wikipedia.org/wiki/Paranormal_romance'],
  },
  'historical-fiction': {
    slug: 'historical-fiction',
    name: 'Historical Fiction',
    wikidataId: 'Q13454',
    wikidataUrl: 'https://www.wikidata.org/wiki/Q13454',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Historical_fiction',
    sameAs: ['https://www.wikidata.org/wiki/Q13454', 'https://en.wikipedia.org/wiki/Historical_fiction'],
  },
  'war-fiction': {
    slug: 'war-fiction',
    name: 'War Fiction',
    wikidataId: 'Q7968593',
    wikidataUrl: 'https://www.wikidata.org/wiki/Q7968593',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/War_novel',
    sameAs: ['https://www.wikidata.org/wiki/Q7968593', 'https://en.wikipedia.org/wiki/War_novel'],
  },
  'alternate-history': {
    slug: 'alternate-history',
    name: 'Alternate History',
    wikidataId: 'Q187834',
    wikidataUrl: 'https://www.wikidata.org/wiki/Q187834',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Alternate_history',
    sameAs: ['https://www.wikidata.org/wiki/Q187834', 'https://en.wikipedia.org/wiki/Alternate_history'],
  },
  'young-adult-ya': {
    slug: 'young-adult-ya',
    name: 'Young Adult (YA)',
    wikidataId: 'Q1233720',
    wikidataUrl: 'https://www.wikidata.org/wiki/Q1233720',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Young_adult_fiction',
    sameAs: ['https://www.wikidata.org/wiki/Q1233720', 'https://en.wikipedia.org/wiki/Young_adult_fiction'],
  },
  'new-adult': {
    slug: 'new-adult',
    name: 'New Adult',
    wikidataId: 'Q17006886',
    wikidataUrl: 'https://www.wikidata.org/wiki/Q17006886',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/New-adult_fiction',
    sameAs: ['https://www.wikidata.org/wiki/Q17006886', 'https://en.wikipedia.org/wiki/New-adult_fiction'],
  },
  'coming-of-age': {
    slug: 'coming-of-age',
    name: 'Coming‑of‑Age',
    wikidataId: 'Q854037',
    wikidataUrl: 'https://www.wikidata.org/wiki/Q854037',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Coming-of-age_story',
    sameAs: ['https://www.wikidata.org/wiki/Q854037', 'https://en.wikipedia.org/wiki/Coming-of-age_story'],
  },
  'slice-of-life': {
    slug: 'slice-of-life',
    name: 'Slice of Life',
    wikidataId: 'Q1194380',
    wikidataUrl: 'https://www.wikidata.org/wiki/Q1194380',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Slice_of_life',
    sameAs: ['https://www.wikidata.org/wiki/Q1194380', 'https://en.wikipedia.org/wiki/Slice_of_life'],
  },
  'family-drama': {
    slug: 'family-drama',
    name: 'Family Drama',
    wikidataId: 'Q130232',
    wikidataUrl: 'https://www.wikidata.org/wiki/Q130232',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Family_drama',
    sameAs: ['https://www.wikidata.org/wiki/Q130232', 'https://en.wikipedia.org/wiki/Family_drama'],
  },
  'political-fiction': {
    slug: 'political-fiction',
    name: 'Political Fiction',
    wikidataId: 'Q258898',
    wikidataUrl: 'https://www.wikidata.org/wiki/Q258898',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Political_fiction',
    sameAs: ['https://www.wikidata.org/wiki/Q258898', 'https://en.wikipedia.org/wiki/Political_fiction'],
  },
  'philosophical-fiction': {
    slug: 'philosophical-fiction',
    name: 'Philosophical Fiction',
    wikidataId: 'Q663478',
    wikidataUrl: 'https://www.wikidata.org/wiki/Q663478',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Philosophical_fiction',
    sameAs: ['https://www.wikidata.org/wiki/Q663478', 'https://en.wikipedia.org/wiki/Philosophical_fiction'],
  },
  'faith-spirituality': {
    slug: 'faith-spirituality',
    name: 'Faith & Spirituality',
    wikidataId: 'Q9174',
    wikidataUrl: 'https://www.wikidata.org/wiki/Q9174',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Spirituality',
    sameAs: ['https://www.wikidata.org/wiki/Q9174', 'https://en.wikipedia.org/wiki/Spirituality'],
  },
}

/**
 * Common Tropes and Narrative Themes Knowledge Graph Entities
 */
export const TROPE_KNOWLEDGE_GRAPH: Record<string, KnowledgeEntity> = {
  'enemies-to-lovers': {
    slug: 'enemies-to-lovers',
    name: 'Enemies to Lovers',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Enemies_to_lovers',
    sameAs: ['https://en.wikipedia.org/wiki/Enemies_to_lovers'],
  },
  'slow-burn': {
    slug: 'slow-burn',
    name: 'Slow Burn',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Slow_burn_(trope)',
    sameAs: ['https://en.wikipedia.org/wiki/Slow_burn_(trope)'],
  },
  'fake-dating': {
    slug: 'fake-dating',
    name: 'Fake Dating',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Fake_relationship',
    sameAs: ['https://en.wikipedia.org/wiki/Fake_relationship'],
  },
  'friends-to-lovers': {
    slug: 'friends-to-lovers',
    name: 'Friends to Lovers',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Romance_novel',
    sameAs: ['https://en.wikipedia.org/wiki/Romance_novel'],
  },
  'second-chance': {
    slug: 'second-chance',
    name: 'Second Chance',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Romance_novel',
    sameAs: ['https://en.wikipedia.org/wiki/Romance_novel'],
  },
  memory: {
    slug: 'memory',
    name: 'Memory',
    wikidataId: 'Q492',
    wikidataUrl: 'https://www.wikidata.org/wiki/Q492',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Memory',
    sameAs: ['https://www.wikidata.org/wiki/Q492', 'https://en.wikipedia.org/wiki/Memory'],
  },
  isolation: {
    slug: 'isolation',
    name: 'Isolation',
    wikidataId: 'Q645484',
    wikidataUrl: 'https://www.wikidata.org/wiki/Q645484',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Solitude',
    sameAs: ['https://www.wikidata.org/wiki/Q645484', 'https://en.wikipedia.org/wiki/Solitude'],
  },
  identity: {
    slug: 'identity',
    name: 'Identity',
    wikidataId: 'Q844569',
    wikidataUrl: 'https://www.wikidata.org/wiki/Q844569',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Identity_(social_science)',
    sameAs: ['https://www.wikidata.org/wiki/Q844569', 'https://en.wikipedia.org/wiki/Identity_(social_science)'],
  },
  revenge: {
    slug: 'revenge',
    name: 'Revenge',
    wikidataId: 'Q524317',
    wikidataUrl: 'https://www.wikidata.org/wiki/Q524317',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Revenge',
    sameAs: ['https://www.wikidata.org/wiki/Q524317', 'https://en.wikipedia.org/wiki/Revenge'],
  },
  redemption: {
    slug: 'redemption',
    name: 'Redemption',
    wikidataId: 'Q7305786',
    wikidataUrl: 'https://www.wikidata.org/wiki/Q7305786',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Redemption_(theology)',
    sameAs: ['https://www.wikidata.org/wiki/Q7305786', 'https://en.wikipedia.org/wiki/Redemption_(theology)'],
  },
  survival: {
    slug: 'survival',
    name: 'Survival',
    wikidataId: 'Q1056584',
    wikidataUrl: 'https://www.wikidata.org/wiki/Q1056584',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Survival_skills',
    sameAs: ['https://www.wikidata.org/wiki/Q1056584', 'https://en.wikipedia.org/wiki/Survival_skills'],
  },
  'forbidden-love': {
    slug: 'forbidden-love',
    name: 'Forbidden Love',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Forbidden_love',
    sameAs: ['https://en.wikipedia.org/wiki/Forbidden_love'],
  },
  obsession: {
    slug: 'obsession',
    name: 'Obsession',
    wikidataId: 'Q681024',
    wikidataUrl: 'https://www.wikidata.org/wiki/Q681024',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Obsession_(psychology)',
    sameAs: ['https://www.wikidata.org/wiki/Q681024', 'https://en.wikipedia.org/wiki/Obsession_(psychology)'],
  },
}

/**
 * Resolves authoritative sameAs URLs for any category, genre, or trope slug.
 */
export function getEntitySameAs(slugOrName: string | null | undefined): string[] {
  if (!slugOrName || typeof slugOrName !== 'string') return []
  const normalized = slugOrName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  if (GENRE_KNOWLEDGE_GRAPH[normalized]?.sameAs) {
    return GENRE_KNOWLEDGE_GRAPH[normalized].sameAs
  }
  if (CATEGORY_KNOWLEDGE_GRAPH[normalized]?.sameAs) {
    return CATEGORY_KNOWLEDGE_GRAPH[normalized].sameAs
  }
  if (TROPE_KNOWLEDGE_GRAPH[normalized]?.sameAs) {
    return TROPE_KNOWLEDGE_GRAPH[normalized].sameAs
  }

  return []
}

/**
 * Builds Schema.org `about` Thing with linked Knowledge Graph entities.
 */
export function buildKnowledgeEntity(name: string, url?: string) {
  const sameAs = getEntitySameAs(name)
  return {
    '@type': 'Thing',
    name,
    ...(url ? { url } : {}),
    ...(sameAs.length > 0 ? { sameAs } : {}),
  }
}
