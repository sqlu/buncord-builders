import { describe, it, expect } from 'bun:test';
import {
  ButtonBuilder,
  ButtonStyle,
} from '../src/index.ts';

describe('ButtonBuilder', () => {
  describe('Regular button', () => {
    it('creates a primary button', () => {
      const btn = new ButtonBuilder({
        customId: 'confirm',
        style: ButtonStyle.Primary,
        label: 'Confirm',
      });
      const json = btn.toJSON();
      expect(json.type).toBe(2);
      expect(json.custom_id).toBe('confirm');
      expect(json.style).toBe(ButtonStyle.Primary);
      expect(json.label).toBe('Confirm');
    });

    it('can be created empty and configured with setters', () => {
      const btn = new ButtonBuilder()
        .setCustomId('confirm')
        .setStyle(ButtonStyle.Primary)
        .setLabel('Confirm');
      const json = btn.toJSON();
      expect(json.type).toBe(2);
      expect(json.custom_id).toBe('confirm');
      expect(json.style).toBe(ButtonStyle.Primary);
      expect(json.label).toBe('Confirm');
    });

    it('can be created with empty object and configured with setters', () => {
      const btn = new ButtonBuilder({})
        .setCustomId('confirm')
        .setStyle(ButtonStyle.Primary)
        .setLabel('Confirm');
      const json = btn.toJSON();
      expect(json.type).toBe(2);
      expect(json.custom_id).toBe('confirm');
      expect(json.style).toBe(ButtonStyle.Primary);
      expect(json.label).toBe('Confirm');
    });

    it('throws if label exceeds 80 chars', () => {
      expect(() =>
        new ButtonBuilder({
          customId: 'x',
          style: ButtonStyle.Secondary,
          label: 'a'.repeat(81),
        }),
      ).toThrow('label is too long');
    });

    it('accepts emoji without label', () => {
      const btn = new ButtonBuilder({
        customId: 'react',
        style: ButtonStyle.Success,
        emoji: { name: '🔥' },
      });
      expect(btn.toJSON().emoji).toEqual({ name: '🔥' });
    });

    it('setDisabled works', () => {
      const btn = new ButtonBuilder({
        customId: 'x',
        style: ButtonStyle.Danger,
        label: 'Delete',
      }).setDisabled(true);
      expect(btn.toJSON().disabled).toBe(true);
    });
  });

  describe('Link button', () => {
    it('creates a link button', () => {
      const btn = new ButtonBuilder({
        style: ButtonStyle.Link,
        url: 'https://discord.com',
        label: 'Open',
      });
      const json = btn.toJSON();
      expect(json.url).toBe('https://discord.com');
      expect(json.custom_id).toBeUndefined();
    });

    it('creates a link button with discord:// protocol link', () => {
      const btn = new ButtonBuilder({
        style: ButtonStyle.Link,
        url: 'discord://-/users/123456789012345678',
        label: 'Open Profile',
      });
      const json = btn.toJSON();
      expect(json.url).toBe('discord://-/users/123456789012345678');
      expect(json.custom_id).toBeUndefined();
    });



    it('throws if url is not http/https/discord', () => {
      expect(() =>
        // @ts-expect-error
        new ButtonBuilder({
          style: ButtonStyle.Link,
          url: 'ftp://bad.url',
          label: 'FTP',
        }),
      ).toThrow('http, https, or discord');
    });


  });

  describe('Premium button', () => {
    it('creates a premium button', () => {
      const btn = new ButtonBuilder({
        style: ButtonStyle.Premium,
        skuId: '1234567890',
      });
      expect(btn.toJSON().sku_id).toBe('1234567890');
    });


  });

  it('verifies getters, aliases and from() resolver', () => {
    const btn = new ButtonBuilder({
      customId: 'x',
      style: ButtonStyle.Primary,
      label: 'A',
      emoji: { name: '😊' },
      disabled: false,
    });
    expect(btn.customId).toBe('x');
    expect(btn.style).toBe(ButtonStyle.Primary);
    expect(btn.label).toBe('A');
    expect(btn.emoji).toEqual({ name: '😊' });
    expect(btn.disabled).toBe(false);

    const linkBtn = new ButtonBuilder({
      style: ButtonStyle.Link,
      url: 'https://discord.com',
      label: 'Link',
    });
    expect(linkBtn.url).toBe('https://discord.com');

    const premBtn = new ButtonBuilder({
      style: ButtonStyle.Premium,
      sku_id: '999',
    });
    expect(premBtn.skuId).toBe('999');

    const resolved = ButtonBuilder.from(btn.toJSON());
    expect(resolved.customId).toBe('x');
    
    const resolvedLink = ButtonBuilder.from(linkBtn.toJSON());
    expect(resolvedLink.url).toBe('https://discord.com');

    const resolvedPrem = ButtonBuilder.from(premBtn.toJSON());
    expect(resolvedPrem.skuId).toBe('999');
  });
});
