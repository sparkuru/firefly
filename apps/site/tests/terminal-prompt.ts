import { SITE_CONFIG } from '../src/lib/site-config.mjs';

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

export function terminalPrompt(cwd = SITE_CONFIG.terminal.cwd): string {
  return `${SITE_CONFIG.terminal.user}${SITE_CONFIG.terminal.promptMarker}${SITE_CONFIG.terminal.host}:${cwd} #`;
}

export function terminalPromptName(cwd = SITE_CONFIG.terminal.cwd): RegExp {
  return new RegExp(`Command for ${escapeRegExp(terminalPrompt(cwd))}$`, 'u');
}
