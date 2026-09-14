import React, { ReactNode } from "react";
import { AWARD_TONES } from "../data/vocabulary";

export interface Metric {
  value: string;
  label: string;
}

export interface SkillCategory {
  name: string;
  icon: ReactNode;
  skills: string[];
  /** Hover/press border classes matching the icon's accent — see accentHighlightOf. */
  highlight: string;
}

/**
 * How an award card is coloured. A name rather than the colours themselves:
 * the data says which of the three an entry belongs to, and AwardCard
 * decides what that looks like. The class strings used to sit in the data
 * module, which is why it could not be read by anything but a component.
 */
export type AwardTone = (typeof AWARD_TONES)[number];

export interface AwardRecord {
  title: string;
  company: string;
  issued: string;
  desc: string;
  tone: AwardTone;
}

export interface Project {
  role: string;
  period: string;
  bullets: string[];
  tags: string[];
}

export interface Job {
  role: string;
  company: string;
  period: string;
  desc?: string;
  bullets?: string[];
  tags: string[];
  projects?: Project[];
}

export interface CommunityItem {
  text: string;
  icon: React.ElementType;
}

export interface BrandItem {
  title: string;
  desc: string;
  icon: ReactNode;
  /** Hover/press border classes matching the icon's accent — see accentHighlightOf. */
  highlight: string;
}

export interface Certification {
  title: string;
  icon: ReactNode;
  /**
   * One entry per credential. This was a single newline-delimited string that
   * the card split back apart, which meant a list was stored as display text:
   * nothing could count it, compare it, or notice an entry going missing.
   */
  items: string[];
  /** Hover/press border classes matching the icon's accent — see accentHighlightOf. */
  highlight: string;
}

export interface Expertise {
  title: string;
  icon: ReactNode;
  desc: string;
  /** Hover/press border classes matching the icon's accent — see accentHighlightOf. */
  highlight: string;
}

export interface KeyProjectLink {
  url: string;
  icon: ReactNode;
  /** What the link is — a report, an article, a profile — so it reads as an
   *  output rather than an unlabelled glyph. Absent on older entries, which
   *  still render as the icon row. */
  label?: string;
  /** The edition or venue the output belongs to, for grouping on a featured
   *  card: "AI Edition · 2024". */
  group?: string;
}

export interface KeyProject {
  title: string;
  desc: string;
  tags: string[];
  mainIcon: ReactNode;
  links?: KeyProjectLink[];
  /** A recurring programme with published outputs: rendered full-width at
   *  the top of the band, its links laid out by edition. */
  featured?: boolean;
}

/**
 * Contracts for the remaining content in portfolioData. Several of these
 * shapes existed only as inference: the data was structurally correct but
 * nothing declared what correct meant, so a renamed or dropped field was a
 * change to the callers rather than a compile error at the source.
 */

export interface HeroData {
  name: string;
  subtitle: string;
  description: string;
  metrics: Metric[];
  tags: string[];
}

export interface AboutData {
  paragraphs: string[];
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
}

/** A credential in the print CV, where the full record is listed. */
export interface CredentialRecord {
  name: string;
  issuer: string;
  date: string;
  /** Registry number, where the issuing body assigns one. */
  id?: string;
}

export interface CredentialGroup {
  category: string;
  /**
   * Named by the group rather than chosen by matching its heading text.
   * The printed CV used to compare `category` against three string
   * literals to pick this, so renaming a group in content dropped its icon
   * silently — measured: one capital letter, and tsc plus 595 tests stayed
   * green. Resolved through src/data/icons.ts, which throws on a name it
   * does not have.
   */
  icon: string;
  items: CredentialRecord[];
}

/** A contact detail split into display parts and a single href value. */
export interface CvContact {
  display: string[];
  href: string;
}

export interface CvHeader {
  name: string;
  title: string;
  phone: CvContact;
  email: CvContact;
  linkedin: string;
  website: string;
  location: string;
}

export interface CvEntry {
  title: string;
  desc: string;
}

/**
 * The print CV. It is deliberately not the same content as the page: it is
 * tailored so a reader is not flooded, which is why it has its own shape
 * rather than reusing the section types.
 */
export interface CvData {
  header: CvHeader;
  summary: string;
  skills: { category: string; items: string }[];
  passions: string[];
  community: CvEntry[];
  recognition: CvEntry[];
}
