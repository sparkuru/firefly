export type TextLine = string;

export interface TextStream {
  readonly lines: readonly TextLine[];
}

export interface ReadonlyShellScratchFile {
  readonly name: string;
  readonly lines: readonly TextLine[];
}

export interface ReadonlyShellAlias {
  readonly name: string;
  readonly target: string;
}

export interface ReadonlyShellSession {
  readonly history: readonly string[];
  readonly scratch: readonly ReadonlyShellScratchFile[];
  /** Session aliases are intentionally in-memory and disappear with the session. */
  readonly aliases?: readonly ReadonlyShellAlias[];
}

export type ShellStatePatch =
  | { readonly kind: 'cwd'; readonly cwd: string }
  | { readonly kind: 'session'; readonly session: ReadonlyShellSession };

export type ShellCommandGroup =
  | 'Explore'
  | 'Read & navigate'
  | 'Identity & time'
  | 'Session'
  | 'Other';

export interface ShellCommandMetadata {
  readonly name: string;
  readonly aliases: readonly string[];
  readonly usage: string;
  readonly summary: string;
  readonly group: ShellCommandGroup;
  readonly order: number;
  readonly examples?: readonly ShellHelpExample[];
}

export interface ShellHelpExample {
  readonly command: string;
  readonly description: string;
}

export interface ShellIdentity {
  readonly user: string;
  readonly host: string;
  readonly workingDirectory: string;
  readonly about: string;
}

export interface ShellLink {
  readonly name: string;
  readonly desc?: string;
  readonly url: string;
}

export type ShellControlEvent =
  | { readonly kind: 'clear-transcript' }
  | { readonly kind: 'open-document'; readonly path: string }
  | { readonly kind: 'open-experiment'; readonly id: string };

export interface GrepMatch {
  readonly path: string;
  readonly lineNumber?: number;
  readonly line: string;
  readonly ranges: readonly (readonly [number, number])[];
}

export interface GrepReport {
  readonly pattern: string;
  readonly matches: readonly GrepMatch[];
  readonly noResults: boolean;
  readonly truncated: boolean;
}

export interface HelpCommand {
  readonly name: string;
  readonly aliases: readonly string[];
  readonly summary: string;
  readonly usage: string;
  readonly examples?: readonly ShellHelpExample[];
}

export interface HelpGroup {
  readonly name: ShellCommandGroup;
  readonly commands: readonly HelpCommand[];
}

export type CommandValue =
  | { readonly kind: 'directory-listing'; readonly listing: import('../vfs/contracts.js').DirectoryListing }
  | { readonly kind: 'document'; readonly document: import('../vfs/contracts.js').PublicDocument }
  | {
      readonly kind: 'document-search';
      readonly keyword: string;
      readonly documents: readonly import('../vfs/contracts.js').PublicDocument[];
    }
  | { readonly kind: 'grep-report'; readonly report: GrepReport }
  | { readonly kind: 'help'; readonly groups: readonly HelpGroup[]; readonly detail?: HelpCommand }
  | { readonly kind: 'links'; readonly links: readonly ShellLink[] }
  | {
      readonly kind: 'tree';
      readonly root: string;
      readonly lines: readonly string[];
      readonly nodes: readonly import('../vfs/contracts.js').TreeLine[];
    };

export interface ProcessResult {
  readonly status: number;
  readonly stdout: TextStream;
  readonly stderr: TextStream;
  readonly statePatch?: ShellStatePatch;
  readonly controls?: readonly ShellControlEvent[];
  readonly value?: CommandValue;
}

export interface ShellSignal {
  readonly aborted: boolean;
}

export interface ProcessContext {
  /** Undefined means the process was not connected to a predecessor. */
  readonly stdin?: TextStream;
  readonly cwd: string;
  readonly fs: import('../vfs/contracts.js').ReadonlyVirtualFs;
  readonly session: ReadonlyShellSession;
  readonly clock: () => Date;
  readonly signal: ShellSignal;
  readonly commands?: readonly ShellCommandMetadata[];
  readonly identity?: ShellIdentity;
  readonly friendLinks?: readonly ShellLink[];
}
