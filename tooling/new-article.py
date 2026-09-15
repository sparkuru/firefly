#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Interactively create a schema-valid Firefly Markdown document."""

import argparse
import datetime
import os
import re
import shlex
import shutil
import subprocess
import sys
import tempfile
import traceback
from dataclasses import dataclass
from pathlib import Path
from typing import NoReturn, Sequence, TextIO

try:
    import readline as _readline
except ImportError:
    _readline = None


DEBUG_MODE = False
UNSAFE_PATH_SEGMENT = re.compile(r"[\s\\/?#%:\x00-\x1f\x7f]")
TAG_SEPARATOR = re.compile(r"[,\uFF0C\u3001]")

THIS_SCRIPT_PATH = os.path.basename(sys.argv[0])


class CLIStyle:
    """Provide semantic terminal colors for this command."""

    COLORS = {
        "TITLE": 7,
        "SUB_TITLE": 2,
        "CONTENT": 3,
        "EXAMPLE": 7,
        "WARNING": 4,
        "ERROR": 2,
    }
    COLOR_TABLE = {
        0: "{}",
        1: "\033[1;30m{}\033[0m",
        2: "\033[1;31m{}\033[0m",
        3: "\033[1;32m{}\033[0m",
        4: "\033[1;33m{}\033[0m",
        5: "\033[1;34m{}\033[0m",
        6: "\033[1;35m{}\033[0m",
        7: "\033[1;36m{}\033[0m",
        8: "\033[1;37m{}\033[0m",
    }

    @staticmethod
    def color(text: str = "", color: int = 3, stream: TextIO | None = None) -> str:
        """Return colored text when the destination is an interactive terminal."""
        destination = stream if stream is not None else sys.stdout
        if os.environ.get("NO_COLOR") or not destination.isatty():
            return text
        return CLIStyle.COLOR_TABLE[color].format(text)


class ColoredArgumentParser(argparse.ArgumentParser):
    """Use semantic colors for argparse help and errors."""

    def _format_action_invocation(self, action: argparse.Action) -> str:
        if not action.option_strings:
            (metavar,) = self._metavar_formatter(action, action.dest)(1)
            return CLIStyle.color(metavar, CLIStyle.COLORS["CONTENT"])

        if action.nargs == 0:
            return ", ".join(
                CLIStyle.color(option, CLIStyle.COLORS["SUB_TITLE"])
                for option in action.option_strings
            )

        args_string = self._format_args(action, action.dest.upper())
        return ", ".join(
            CLIStyle.color(
                f"{option} {args_string}",
                CLIStyle.COLORS["SUB_TITLE"],
            )
            for option in action.option_strings
        )

    def format_help(self) -> str:
        formatter = self._get_formatter()
        if self.description:
            formatter.add_text(
                CLIStyle.color(self.description, CLIStyle.COLORS["TITLE"])
            )
        formatter.add_usage(self.usage, self._actions, self._mutually_exclusive_groups)
        for action_group in self._action_groups:
            formatter.start_section(
                CLIStyle.color(action_group.title, CLIStyle.COLORS["TITLE"])
            )
            formatter.add_arguments(action_group._group_actions)
            formatter.end_section()
        if self.epilog:
            formatter.add_text(CLIStyle.color(self.epilog, CLIStyle.COLORS["CONTENT"]))
        return formatter.format_help()

    def error(self, message: str) -> NoReturn:
        self.print_usage(sys.stderr)
        error = CLIStyle.color(
            f"Error: {message}",
            CLIStyle.COLORS["ERROR"],
            sys.stderr,
        )
        self.exit(2, f"{error}\n")


class ArticleError(Exception):
    """Represent an expected user-facing article creation failure."""


@dataclass(frozen=True)
class TargetInfo:
    """Describe the validated destination selected by the user."""

    blog_root: Path
    target: Path
    relative_target: Path
    collection: str
    stem: str


def emit(message: str, color: int, stream: TextIO | None = None) -> None:
    """Write one semantic status message to the requested stream."""
    destination = stream if stream is not None else sys.stdout
    print(CLIStyle.color(message, color, destination), file=destination)


def info(message: str) -> None:
    """Write an informational status message."""
    emit(message, CLIStyle.COLORS["CONTENT"])


def warning(message: str) -> None:
    """Write a warning status message."""
    emit(f"Warning: {message}", CLIStyle.COLORS["WARNING"], sys.stderr)


def error(message: str) -> None:
    """Write an error status message."""
    emit(f"Error: {message}", CLIStyle.COLORS["ERROR"], sys.stderr)


def repository_root() -> Path:
    """Return the Firefly repository root containing this script."""
    return Path(__file__).resolve().parent.parent


def default_blog_root() -> Path:
    """Return the tracked content fixture used as the safe default root."""
    return repository_root() / "content"


def blog_meta_script() -> Path:
    """Return the existing Node metadata organizer path."""
    return repository_root() / "apps" / "site" / "scripts" / "blog-meta.mjs"


def build_parser() -> ColoredArgumentParser:
    """Build the command-line parser with examples and operational notes."""
    parser = ColoredArgumentParser(
        description="Create one Firefly Markdown article interactively.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "Examples:\n"
            "  {THIS_SCRIPT_PATH} content/posts/notes/first-entry.md\n"
            "  {THIS_SCRIPT_PATH} --editor nvim content/posts/notes/second-entry.md\n"
            "  {THIS_SCRIPT_PATH} --preview content/posts/notes/third-entry.md\n\n"
            "Notes:\n"
            "  TARGET.md is the final path below posts/ or pages/.\n"
            "  The root comes from --blog-root, FIREFLY_CONTENT_ROOT, or content/.\n"
            "  New entries stay drafts unless publication is explicitly confirmed."
        ),
    )
    parser.add_argument(
        "--blog-root",
        metavar="PATH",
        help="blog root containing posts/ and pages/",
    )
    parser.add_argument(
        "--collection",
        choices=("posts", "pages"),
        help="collection; must match the target directory",
    )
    parser.add_argument(
        "--editor",
        metavar="COMMAND",
        help="editor command; defaults to VISUAL, EDITOR, or vi",
    )
    parser.add_argument(
        "--preview",
        action="store_true",
        help="validate and print the generated Markdown without writing",
    )
    parser.add_argument(
        "--log",
        action="store_true",
        help="show a traceback for unexpected failures",
    )
    parser.add_argument("target", metavar="TARGET.md")
    return parser


def parse_arguments(arguments: Sequence[str] | None) -> argparse.Namespace:
    """Parse command-line arguments."""
    return build_parser().parse_args(arguments)


def resolve_blog_root(requested_root: str | None) -> Path:
    """Resolve and validate a blog root containing both collections."""
    configured_root = (
        requested_root
        or os.environ.get("FIREFLY_CONTENT_ROOT")
        or str(default_blog_root())
    )
    try:
        root = Path(configured_root).expanduser().resolve(strict=True)
    except OSError as exception:
        raise ArticleError(
            f"blog root is not readable: {configured_root}"
        ) from exception
    if not root.is_dir():
        raise ArticleError(f"blog root is not a directory: {root}")

    for collection in ("posts", "pages"):
        collection_path = root / collection
        if collection_path.is_symlink() or not collection_path.is_dir():
            raise ArticleError(
                f"blog root must contain a regular {collection}/ directory: {root}"
            )
    return root


def validate_raw_target(target_argument: str) -> Path:
    """Reject unsafe dot segments before resolving the destination path."""
    if not target_argument or "\x00" in target_argument:
        raise ArticleError("a target Markdown path is required")
    raw_target = Path(target_argument).expanduser()
    for segment in raw_target.parts:
        if segment in (raw_target.anchor, ".", ".."):
            if segment in (".", ".."):
                raise ArticleError("target must not contain . or .. path segments")
            continue
        if UNSAFE_PATH_SEGMENT.search(segment):
            raise ArticleError(f"target contains an unsafe path segment: {segment}")
    if not raw_target.name.lower().endswith(".md"):
        raise ArticleError(
            f"target must be a Markdown file ending in .md: {target_argument}"
        )
    return raw_target


def validate_path_segment(segment: str, owner: str) -> None:
    """Validate one canonical path segment against Firefly route rules."""
    if (
        not segment
        or segment in (".", "..")
        or segment.startswith(".")
        or UNSAFE_PATH_SEGMENT.search(segment)
    ):
        raise ArticleError(f"{owner} contains an unsafe path segment: {segment}")


def resolve_target(
    target_argument: str,
    blog_root: Path,
    requested_collection: str | None,
) -> TargetInfo:
    """Resolve and validate the final article destination."""
    raw_target = validate_raw_target(target_argument)
    if raw_target.exists() or raw_target.is_symlink():
        raise ArticleError(f"target already exists: {raw_target}")
    if not raw_target.is_absolute():
        raw_target = Path.cwd() / raw_target

    try:
        target = raw_target.resolve(strict=False)
        relative_target = target.relative_to(blog_root)
    except (OSError, ValueError) as exception:
        raise ArticleError(
            f"target must stay inside the blog root: {blog_root}"
        ) from exception

    for segment in relative_target.parts:
        validate_path_segment(segment, "target")
    if not relative_target.parts or relative_target.parts[0] not in ("posts", "pages"):
        raise ArticleError("target must be below posts/ or pages/")

    inferred_collection = relative_target.parts[0]
    if requested_collection is not None and requested_collection != inferred_collection:
        raise ArticleError(
            f"collection {requested_collection} does not match target directory "
            f"{inferred_collection}"
        )
    if target.exists() or target.is_symlink():
        raise ArticleError(f"target already exists: {target}")

    target_stem = target.name[:-3]
    if not target_stem:
        raise ArticleError("target filename must not be empty")
    return TargetInfo(
        blog_root=blog_root,
        target=target,
        relative_target=relative_target,
        collection=inferred_collection,
        stem=target_stem,
    )


def humanize_stem(stem: str) -> str:
    """Turn a filename stem into a readable default title."""
    value = re.sub(r"^\d+[-_]+", "", stem)
    value = re.sub(r"[-_]+", " ", value).strip()
    return value or "Untitled article"


def readline_available() -> bool:
    """Return whether interactive GNU/Python Readline support is available."""
    return _readline is not None


def read_line(prompt: str, default: str | None = None) -> str:
    """Read one Unicode-editable line, optionally prefilled with a default."""
    if sys.stdin.isatty() and not readline_available():
        raise ArticleError(
            "this interactive terminal needs Python readline support for arrow-key editing"
        )

    try:
        if default is None:
            value = input(f"{prompt}: ")
        elif sys.stdin.isatty() and _readline is not None:

            def insert_default() -> None:
                _readline.insert_text(default)

            _readline.set_startup_hook(insert_default)
            try:
                value = input(f"{prompt}: ")
            finally:
                _readline.set_startup_hook()
        else:
            value = input(f"{prompt} [{default}]: ")
    except EOFError as exception:
        raise ArticleError(
            "input ended before the article was completed"
        ) from exception
    if value == "" and default is not None:
        return default
    return value


def ask_yes_no(prompt: str, default_yes: bool = False) -> bool:
    """Ask a repeatable yes/no question and return the selected value."""
    default_hint = "y/N" if not default_yes else "Y/n"
    while True:
        answer = read_line(f"{prompt} [{default_hint}]").strip().lower()
        if not answer:
            return default_yes
        if answer in ("y", "yes"):
            return True
        if answer in ("n", "no"):
            return False
        warning("please answer y/yes or n/no")


def parse_tags(value: str) -> list[str]:
    """Parse comma-like tag separators while preserving tag text."""
    return [tag.strip() for tag in TAG_SEPARATOR.split(value) if tag.strip()]


def collect_metadata(target: TargetInfo) -> dict[str, object]:
    """Collect and validate the interactive metadata choices."""
    title = read_line("Title", humanize_stem(target.stem)).strip()
    if not title:
        raise ArticleError("title must not be empty")
    description = read_line("Description", title).strip()
    if not description:
        raise ArticleError("description must not be empty")

    today = datetime.datetime.now(datetime.timezone.utc).date().isoformat()
    date_value = read_line("Publication date", today).strip()
    draft = not ask_yes_no("Publish immediately?")
    tags = parse_tags(read_line("Tags (comma-separated, optional)"))

    while True:
        access = read_line("Access (public or private:OWNER)", "public").strip()
        if access == "public" or access.startswith("private:"):
            break
        warning("access must be public or private:OWNER")

    layout = "post"
    metadata: dict[str, object] = {
        "title": title,
        "description": description,
        "date": date_value,
        "draft": draft,
        "layout": layout,
        "access": access,
        "tags": tags,
    }
    if target.collection == "pages":
        layout = read_line("Page layout (page/timeline/files)", "page").strip()
        if layout not in ("page", "timeline", "files"):
            raise ArticleError("page layout must be page, timeline, or files")
        page_slug = read_line("Page slug", target.stem).strip()
        if not page_slug:
            raise ArticleError("page slug must not be empty")
        metadata["layout"] = layout
        metadata["slug"] = page_slug
    return metadata


def parse_editor_command(editor_spec: str) -> list[str]:
    """Parse an editor command without invoking a shell."""
    try:
        command = shlex.split(editor_spec)
    except ValueError as exception:
        raise ArticleError(f"invalid editor command: {exception}") from exception
    if not command:
        raise ArticleError("editor command must not be empty")
    if shutil.which(command[0]) is None:
        raise ArticleError(f"editor command not found: {command[0]}")
    return command


def editor_spec_from_environment(explicit_editor: str | None) -> str:
    """Select an explicit editor or the conventional environment fallback."""
    return (
        explicit_editor or os.environ.get("VISUAL") or os.environ.get("EDITOR") or "vi"
    )


def prepare_body(temp_root: Path, title: str, editor_spec: str) -> Path:
    """Create a temporary body, open it in the editor, and verify the result."""
    body_path = temp_root / "article.md"
    body_path.write_text(f"# {title}\n\n", encoding="utf-8")
    body_path.chmod(0o644)
    editor_command = parse_editor_command(editor_spec)
    info("Opening the article body in the editor. Save and close it to continue.")
    try:
        result = subprocess.run(
            [*editor_command, str(body_path)],
            check=False,
        )
    except OSError as exception:
        raise ArticleError(f"editor command failed: {editor_command[0]}") from exception
    if result.returncode != 0:
        raise ArticleError(
            f"editor command failed with status {result.returncode}: {editor_command[0]}"
        )
    if body_path.is_symlink() or not body_path.is_file():
        raise ArticleError("editor did not leave a regular article body file")
    body_path.chmod(0o644)
    return body_path


def blog_meta_arguments(
    body_path: Path,
    target: TargetInfo,
    metadata: dict[str, object],
    preview: bool,
) -> list[str]:
    """Build the argument vector for the existing Node metadata organizer."""
    arguments = [
        str(body_path),
        "--blog-root",
        str(target.blog_root),
        "--collection",
        target.collection,
        "--output",
        target.relative_target.as_posix(),
        "--title",
        str(metadata["title"]),
        "--description",
        str(metadata["description"]),
        "--date",
        str(metadata["date"]),
        "--draft",
        str(metadata["draft"]).lower(),
        "--layout",
        str(metadata["layout"]),
        "--access",
        str(metadata["access"]),
    ]
    if target.collection == "pages":
        arguments.extend(("--slug", str(metadata["slug"])))
    for tag in metadata["tags"]:
        arguments.extend(("--tag", str(tag)))
    if preview:
        arguments.append("--preview")
    return arguments


def run_blog_meta(
    body_path: Path,
    target: TargetInfo,
    metadata: dict[str, object],
    preview: bool,
) -> int:
    """Run the existing schema-aware organizer and return its status."""
    node = shutil.which("node")
    if node is None:
        raise ArticleError("required command not found: node")
    organizer = blog_meta_script()
    if not organizer.is_file():
        raise ArticleError(f"blog-meta script is missing: {organizer}")
    try:
        result = subprocess.run(
            [
                node,
                str(organizer),
                *blog_meta_arguments(body_path, target, metadata, preview),
            ],
            check=False,
            capture_output=True,
            encoding="utf-8",
            errors="replace",
        )
    except OSError as exception:
        raise ArticleError("could not start the blog-meta organizer") from exception
    if result.stderr:
        sys.stderr.write(result.stderr)
    forward_organizer_output(result.stdout)
    return result.returncode


def forward_organizer_output(output: str) -> None:
    """Forward organizer output and color successful Wrote lines green."""
    for line in output.splitlines(keepends=True):
        content = line.rstrip("\r\n")
        ending = line[len(content) :]
        if content.startswith("Wrote "):
            content = CLIStyle.color(content, CLIStyle.COLORS["CONTENT"])
        sys.stdout.write(f"{content}{ending}")
    sys.stdout.flush()


def confirm_creation(target: TargetInfo, metadata: dict[str, object]) -> bool:
    """Show the final summary and ask whether to write the new document."""
    emit("Article summary", CLIStyle.COLORS["TITLE"], sys.stderr)
    emit(
        f"Target: {target.relative_target.as_posix()}",
        CLIStyle.COLORS["CONTENT"],
        sys.stderr,
    )
    emit(f"Collection: {target.collection}", CLIStyle.COLORS["CONTENT"], sys.stderr)
    emit(f"Title: {metadata['title']}", CLIStyle.COLORS["CONTENT"], sys.stderr)
    emit(
        f"Draft: {str(metadata['draft']).lower()}",
        CLIStyle.COLORS["CONTENT"],
        sys.stderr,
    )
    return ask_yes_no("Create this article?", default_yes=True)


def main(arguments: Sequence[str] | None = None) -> int:
    """Run the interactive article creator."""
    global DEBUG_MODE
    options = parse_arguments(arguments)
    DEBUG_MODE = bool(options.log)
    try:
        root = resolve_blog_root(options.blog_root)
        target = resolve_target(options.target, root, options.collection)
        info(f"Using collection: {target.collection}")
        metadata = collect_metadata(target)
        editor_spec = editor_spec_from_environment(options.editor)
        with tempfile.TemporaryDirectory(
            prefix="firefly-new-article-"
        ) as temporary_root:
            body_path = prepare_body(
                Path(temporary_root), str(metadata["title"]), editor_spec
            )
            if options.preview:
                return run_blog_meta(body_path, target, metadata, True)
            if not confirm_creation(target, metadata):
                info("Cancelled.")
                return 0
            return run_blog_meta(body_path, target, metadata, False)
    except ArticleError as exception:
        error(str(exception))
        return 1
    except KeyboardInterrupt:
        warning("cancelled")
        return 130
    except Exception as exception:
        if DEBUG_MODE:
            traceback.print_exc()
        error(str(exception))
        return 1


if __name__ == "__main__":
    sys.exit(main())
