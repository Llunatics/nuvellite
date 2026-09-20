import { Publisher, Imprint } from '../types';

export interface PublisherRuleConfig {
  id: string;
  name: string;
  shortName: string;
  slug: string;
  country: string;
  description: string;
  vendorSlugs: string[];
  imprints: Imprint[];
  positiveTitleKeywords: string[];
  negativeTitleKeywords: string[];
  enabled: boolean;
  priority: number;
}

export const PUBLISHER_CONFIG: Record<string, PublisherRuleConfig> = {
  pub_elex: {
    id: 'pub_elex',
    name: 'Elex Media Komputindo',
    shortName: 'Elex Media',
    slug: 'elex-media-komputindo',
    country: 'Indonesia',
    description: 'Pionir penerbit manga dan komik Jepang di Indonesia sejak dekade 1990-an di bawah payung Gramedia Group.',
    vendorSlugs: ['elex-media-komputindo', 'elex'],
    imprints: [
      {
        id: 'imp_elex_manga',
        name: 'Elex Manga',
        slug: 'elex-manga',
        publisherId: 'pub_elex',
        description: 'Lini utama manga dan komik Elex Media Komputindo.',
        format: 'MANGA',
      },
      {
        id: 'imp_level_comics',
        name: 'Level Comics',
        slug: 'level-comics',
        publisherId: 'pub_elex',
        description: 'Imprint komik dewasa/seinen dengan standar kualitas premium.',
        format: 'MANGA',
      },
    ],
    positiveTitleKeywords: [
      'komik', 'manga', 'level comic', 'lc:', 'lc :', 'bind up', 'deluxe', 'special edition'
    ],
    negativeTitleKeywords: [
      'ensiklopedia', 'buku anak', 'bisnis', 'investasi', 'manajemen', 'parenting',
      'resep', 'kuliner', 'diet', 'kesehatan', 'agama', 'kamus', 'atlas', 'utbk', 'cpns'
    ],
    enabled: true,
    priority: 1,
  },
  pub_mnc: {
    id: 'pub_mnc',
    name: 'm&c! Publishing',
    shortName: 'm&c!',
    slug: 'mc',
    country: 'Indonesia',
    description: 'Penerbit komik dan light novel terkemuka dengan lini populer seperti Akasha, Koloni, dan Clover.',
    vendorSlugs: ['mc', 'mnc'],
    imprints: [
      {
        id: 'imp_mnc_comics',
        name: 'm&c! Comics',
        slug: 'mnc-comics',
        publisherId: 'pub_mnc',
        description: 'Lini utama komik m&c! Publishing.',
        format: 'MANGA',
      },
      {
        id: 'imp_akasha',
        name: 'Akasha',
        slug: 'akasha',
        publisherId: 'pub_mnc',
        description: 'Imprint m&c! untuk manga josei, seinen, dan sastra grafis berkualitas.',
        format: 'MANGA',
      },
      {
        id: 'imp_koloni',
        name: 'Koloni',
        slug: 'koloni',
        publisherId: 'pub_mnc',
        description: 'Imprint khusus komik karya komikus Indonesia berprestasi.',
        format: 'MANGA',
      },
      {
        id: 'imp_clover',
        name: 'Clover',
        slug: 'clover',
        publisherId: 'pub_mnc',
        description: 'Lini novel dan light novel terjemahan resmi m&c! Publishing.',
        format: 'LIGHT_NOVEL',
      },
    ],
    positiveTitleKeywords: [
      'komik', 'manga', 'akasha', 'koloni', 'clover', 'light novel'
    ],
    negativeTitleKeywords: [
      'ensiklopedia', 'buku anak', 'funtastic', 'belajar membaca', 'mewarnai', 'aktivitas'
    ],
    enabled: true,
    priority: 2,
  },
  pub_pgi: {
    id: 'pub_pgi',
    name: 'Phoenix Gramedia Indonesia',
    shortName: 'PGI',
    slug: 'phoenix-gramedia-indonesia',
    country: 'Indonesia',
    description: 'Penerbit resmi hasil joint-venture Gramedia & KADOKAWA Japan, menghadirkan Manga & Light Novel resmi di Indonesia.',
    vendorSlugs: ['phoenix-gramedia-indonesia', 'pgi'],
    imprints: [
      {
        id: 'imp_pgi_manga',
        name: 'PGI Manga',
        slug: 'pgi-manga',
        publisherId: 'pub_pgi',
        description: 'Rilisan resmi manga terjemahan langsung dari lisensi KADOKAWA Japan.',
        format: 'MANGA',
      },
      {
        id: 'imp_pgi_ln',
        name: 'PGI Light Novel',
        slug: 'pgi-light-novel',
        publisherId: 'pub_pgi',
        description: 'Rilisan resmi light novel berlisensi langsung dari KADOKAWA Japan.',
        format: 'LIGHT_NOVEL',
      },
    ],
    positiveTitleKeywords: [
      'light novel', 'manga', 'kadokawa', 'komik'
    ],
    negativeTitleKeywords: [
      'puzzle', 'game', 'canvas', 'paint by number', 'journal', 'geronimo stilton',
      'thea stilton', 'story orchestra', 'pop-up', 'start with why', 'ego is the enemy',
      'daring greatly', 'dare to lead', 'burnout', 'the idiot', 'hukum', 'kuhp',
      'feminism', 'parenting', 'board book', 'catstronauts', 'treasure pack'
    ],
    enabled: true,
    priority: 3,
  },
};

export const OFFICIAL_PUBLISHERS: Publisher[] = Object.values(PUBLISHER_CONFIG).map((cfg) => ({
  id: cfg.id,
  name: cfg.name,
  slug: cfg.slug,
  shortName: cfg.shortName,
  country: cfg.country,
  description: cfg.description,
  imprints: cfg.imprints,
}));
