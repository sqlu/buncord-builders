import { describe, expect, it } from 'bun:test';
import { ButtonBuilder, ButtonStyle, SPEC_PROVENANCE } from '../src/index.ts';

/**
 * Keeps the recorded provenance honest.
 *
 * The date and the source list are claims about work a human did, and no test
 * can prove that work happened. What these tests can do is make every exception
 * carry a probe that demonstrates the behaviour it claims, so an entry cannot be
 * added, reworded or left behind without a test noticing.
 */

/** One executable demonstration per exception, keyed by its code. */
const probes: Record<string, () => void> = {
  // Undocumented and permissive: the builder has to accept the scheme.
  LINK_BUTTON_URL_SCHEME() {
    const button = new ButtonBuilder({
      style: ButtonStyle.Link,
      url: 'discord://-/channels/1/2',
      label: 'Open',
    });
    expect(button.toJSON().url).toBe('discord://-/channels/1/2');
  },
};

describe('spec provenance', () => {
  it('records a verification date that is a real, non-future ISO date', () => {
    expect(SPEC_PROVENANCE.verifiedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    const verified = new Date(`${SPEC_PROVENANCE.verifiedOn}T00:00:00Z`);
    expect(Number.isNaN(verified.getTime())).toBe(false);
    expect(verified.getTime()).toBeLessThanOrEqual(Date.now());
  });

  it('names an authoritative reference and keeps community sources separate', () => {
    expect(SPEC_PROVENANCE.primaryReference).toStartWith('https://docs.discord.com/developers/');
    expect(SPEC_PROVENANCE.secondaryReferences.length).toBeGreaterThan(0);
    for (const reference of SPEC_PROVENANCE.secondaryReferences) {
      expect(reference).toStartWith('https://');
      expect(reference).not.toStartWith('https://docs.discord.com/');
    }
  });

  it('describes every exception it lists', () => {
    for (const entry of SPEC_PROVENANCE.exceptions) {
      expect(entry.code.length).toBeGreaterThan(0);
      expect(entry.rule.length).toBeGreaterThan(0);
      expect(entry.rationale.length).toBeGreaterThan(0);
      expect(['sources-disagree', 'unverified']).toContain(entry.verification);
    }
  });

  // The ratchet: an entry with no probe, or a probe with no entry, fails here.
  it('pins every exception to a probe, and every probe to an exception', () => {
    const codes = SPEC_PROVENANCE.exceptions.map((entry) => entry.code as string).sort();
    expect(Object.keys(probes).sort()).toEqual(codes);
  });

  it('demonstrates the behaviour each exception claims', () => {
    for (const entry of SPEC_PROVENANCE.exceptions) {
      probes[entry.code]!();
    }
  });
});
