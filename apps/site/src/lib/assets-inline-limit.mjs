export function terminalHomeAssetsInlineLimit(filename) {
  if (typeof filename !== 'string') {
    return undefined;
  }
  const normalized = filename.replaceAll('\\', '/');
  return /^_astro\/TerminalHome\.astro_astro_type_script_index_0_lang\.[A-Za-z0-9_-]+\.js$/u.test(normalized)
    ? false
    : undefined;
}
