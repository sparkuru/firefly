#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_NAME=$(basename "$0")
readonly SCRIPT_NAME
SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)
readonly SCRIPT_DIR
readonly DEFAULT_SCHEMA_FILE="${SCRIPT_DIR}/../apps/site/src/lib/content-schema.mjs"
readonly DEFAULT_DRAFT=true

readonly -a SHARED_FIELDS=(
	title
	htmlTitle
	date
	updated
	description
	canonical
	seoImage
	noindex
	tags
	firefly
	draft
	presentation
	aliases
	source
	access
)
readonly -a POST_REQUIRED_FIELDS=(title description date draft layout)
readonly -a PAGE_REQUIRED_FIELDS=(title description date draft layout slug)
readonly -a PAGE_LAYOUT_CANDIDATES=(page timeline files)

mode='check'
root_path=
collection=all
schema_file=${DEFAULT_SCHEMA_FILE}
date_value=
draft_value=${DEFAULT_DRAFT}
layout_value=
title_override=
description_override=
slug_override=
temp_dir=

declare -a candidate_files=()
declare -a candidate_collections=()
declare -a candidate_relative_paths=()
declare -a candidate_titles=()
declare -a candidate_descriptions=()
declare -a candidate_slugs=()

usage() {
	cat >&2 <<EOF
Usage: ${SCRIPT_NAME} --root BLOG_ROOT [options]

Inspect or add minimal frontmatter to non-empty Markdown files without a
frontmatter delimiter. Existing frontmatter and zero-byte files are skipped.
This command checks frontmatter presence only; project schema, rendered-output,
build, and test validation run separately.

Options:
  --root PATH             Blog root containing readable posts/ and pages/
  --collection NAME       posts, pages, or all (default: all)
  --check                 Report proposed repairs and exit 1 when any exist
  --write                 Apply proposed repairs to source files
  --date YYYY-MM-DD       Date for generated entries (default: today)
  --draft true|false      Draft value for generated entries (default: true)
  --layout VALUE          post, page, timeline, or files (collection checked)
  --title TEXT            Use one title for every generated entry
  --description TEXT      Use one description for every generated entry
  --slug TEXT             Use one page slug for every generated entry
  --schema-file PATH      Schema source to inspect (default: project postSchema)
  --print-schema          Print the registered fields and candidates
  --help                  Show this help

The default mode is read-only. --write is required for source mutation.
EOF
}

die() {
	printf 'Error: %s\n' "$*" >&2
	exit 1
}

info() {
	printf '%s\n' "$*"
}

require_command() {
	command -v "$1" >/dev/null 2>&1 || die "required command not found: $1"
}

trim_text() {
	local value=$1
	value=${value#"${value%%[![:space:]]*}"}
	value=${value%"${value##*[![:space:]]}"}
	printf '%s' "$value"
}

normalize_text() {
	local value=$1
	value=${value//$'\r'/ }
	value=${value//$'\n'/ }
	trim_text "$value"
}

yaml_quote() {
	local value
	value=$(normalize_text "$1")
	value=${value//\\/\\\\}
	value=${value//\"/\\\"}
	printf '"%s"' "$value"
}

schema_has_shared_field() {
	local field=$1

	awk -v field="$field" '
        /const sharedMetadata = \{/ { in_block = 1; next }
        in_block && /^\};/ { in_block = 0 }
        in_block && $0 ~ "^[[:space:]]*" field "[[:space:]]*[:,]" { found = 1 }
        END { exit(found ? 0 : 1) }
    ' "$schema_file"
}

validate_schema_registry() {
	[[ -r "$schema_file" ]] || die "schema source is not readable: $schema_file"

	local field
	for field in "${SHARED_FIELDS[@]}"; do
		schema_has_shared_field "$field" || die "schema field is not registered: $field"
	done

	grep -Fq -- "slug: slug.optional()" "$schema_file" ||
		die 'post slug declaration is missing from the schema source'
	grep -Fq -- "slug," "$schema_file" ||
		die 'page slug declaration is missing from the schema source'
	grep -Fq -- "layout: z.literal('post')" "$schema_file" ||
		die 'post layout candidate is missing from the schema source'
	grep -Fq -- "layout: z.enum(['page', 'timeline', 'files'])" "$schema_file" ||
		die 'page layout candidates are missing from the schema source'
}

print_schema() {
	info 'Shared fields:'
	printf '  %s\n' "${SHARED_FIELDS[*]}"
	info 'Post required fields:'
	printf '  %s\n' "${POST_REQUIRED_FIELDS[*]}"
	info 'Page required fields:'
	printf '  %s\n' "${PAGE_REQUIRED_FIELDS[*]}"
	info 'Post layout candidates:'
	info '  post'
	info 'Page layout candidates:'
	printf '  %s\n' "${PAGE_LAYOUT_CANDIDATES[*]}"
}

resolve_root() {
	[[ -n "$root_path" ]] || die '--root is required unless --print-schema is used'
	[[ -d "$root_path" && -r "$root_path" ]] || die "blog root is not readable: $root_path"
	root_path=$(cd -- "$root_path" && pwd -P)

	local collection_name
	for collection_name in posts pages; do
		[[ -d "$root_path/$collection_name" && -r "$root_path/$collection_name" ]] ||
			die "blog root must contain readable $collection_name/: $root_path"
	done
}

validate_options() {
	case "$collection" in
	posts | pages | all) ;;
	*) die "unsupported collection: $collection" ;;
	esac

	[[ "$date_value" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]] ||
		die 'date must use YYYY-MM-DD'
	case "$draft_value" in
	true | false) ;;
	*) die 'draft must be true or false' ;;
	esac

	if [[ -n "$layout_value" ]]; then
		case "$collection" in
		posts)
			[[ "$layout_value" == post ]] || die 'posts require layout: post'
			;;
		pages)
			case "$layout_value" in
			page | timeline | files) ;;
			*) die 'pages require layout: page, timeline, or files' ;;
			esac
			;;
		all)
			die '--layout requires --collection posts or --collection pages'
			;;
		esac
	fi
}

infer_title() {
	local file=$1
	local line
	local title=

	while IFS= read -r line || [[ -n "$line" ]]; do
		line=${line%$'\r'}
		if [[ "$line" =~ ^[[:space:]]*#[[:space:]]+(.+)$ ]]; then
			title=${BASH_REMATCH[1]}
			break
		fi
	done <"$file"

	if [[ -z "$title" ]]; then
		title=${file##*/}
		title=${title%.md}
		if [[ "$title" =~ ^[0-9]+[-_]+(.+)$ ]]; then
			title=${BASH_REMATCH[1]}
		fi
		title=${title//-/ }
		title=${title//_/ }
	fi

	title=$(normalize_text "$title")
	[[ -n "$title" ]] || die "could not infer a title: $file"
	printf '%s' "$title"
}

infer_slug() {
	local file=$1
	local slug=${file##*/}
	slug=${slug%.md}
	if [[ "$slug" =~ ^[0-9]+[-_]+(.+)$ ]]; then
		slug=${BASH_REMATCH[1]}
	fi
	slug=${slug//[[:space:]]/-}
	slug=${slug//_/-}
	slug=$(normalize_text "$slug")
	[[ -n "$slug" ]] || die "could not infer a page slug: $file"
	[[ "$slug" != .* && "$slug" != '.' && "$slug" != '..' ]] ||
		die "inferred page slug is unsafe: $file"
	case "$slug" in
	*'/'* | *\\* | *'?'* | *'#'* | *'%'*) die "inferred page slug is unsafe: $file" ;;
	esac
	[[ ! "$slug" =~ [[:space:]] ]] || die "inferred page slug contains whitespace: $file"
	printf '%s' "$slug"
}

scan_collection() {
	local collection_name=$1
	local collection_root="$root_path/$collection_name"
	local file
	local first_line

	while IFS= read -r -d '' file; do
		[[ -s "$file" ]] || continue
		first_line=
		IFS= read -r first_line <"$file" || true
		[[ "$first_line" == '---' ]] || {
			candidate_files+=("$file")
			candidate_collections+=("$collection_name")
			candidate_relative_paths+=("${file#"$root_path"/}")
		}
	done < <(find "$collection_root" -type f -name '*.md' -print0)
}

render_frontmatter() {
	local collection_name=$1
	local title=$2
	local description=$3
	local slug=$4
	local entry_layout=$layout_value

	if [[ -z "$entry_layout" ]]; then
		entry_layout=$([[ "$collection_name" == posts ]] && printf 'post' || printf 'page')
	fi

	printf '%s\n' '---'
	printf 'title: %s\n' "$(yaml_quote "$title")"
	printf 'description: %s\n' "$(yaml_quote "$description")"
	printf 'date: %s\n' "$date_value"
	printf 'draft: %s\n' "$draft_value"
	printf 'layout: %s\n' "$entry_layout"
	if [[ "$collection_name" == pages ]]; then
		printf 'slug: %s\n' "$(yaml_quote "$slug")"
	fi
	printf '%s\n' '---'
}

prepare_candidates() {
	local index
	local collection_name
	local file
	local title
	local description
	local slug

	for index in "${!candidate_files[@]}"; do
		collection_name=${candidate_collections[index]}
		file=${candidate_files[index]}
		title=${title_override:-$(infer_title "$file")}
		description=${description_override:-$(printf '%s study notes.' "$title")}
		slug=
		if [[ "$collection_name" == pages ]]; then
			slug=${slug_override:-$(infer_slug "$file")}
		fi
		candidate_titles+=("$(normalize_text "$title")")
		candidate_descriptions+=("$(normalize_text "$description")")
		candidate_slugs+=("$slug")
	done
}

print_candidate() {
	local index=$1
	info "Missing frontmatter: ${candidate_relative_paths[index]}"
	render_frontmatter \
		"${candidate_collections[index]}" \
		"${candidate_titles[index]}" \
		"${candidate_descriptions[index]}" \
		"${candidate_slugs[index]}"
}

file_mode() {
	local file=$1
	local mode
	if mode=$(stat -c '%a' -- "$file" 2>/dev/null); then
		printf '%s' "$mode"
		return 0
	fi
	if mode=$(stat -f '%Lp' -- "$file" 2>/dev/null); then
		printf '%s' "$mode"
		return 0
	fi
	die "could not read file mode: $file"
}

write_candidate() {
	local index=$1
	local file=${candidate_files[index]}
	local mode
	local temp_file

	mode=$(file_mode "$file")
	temp_file=$(mktemp "$temp_dir/content.XXXXXX")
	{
		render_frontmatter \
			"${candidate_collections[index]}" \
			"${candidate_titles[index]}" \
			"${candidate_descriptions[index]}" \
			"${candidate_slugs[index]}"
		cat -- "$file"
	} >"$temp_file"
	chmod "$mode" "$temp_file"

	if ! mv -- "$temp_file" "$file" 2>/dev/null; then
		cp -- "$temp_file" "$file"
		rm -f -- "$temp_file"
	fi
	info "Formatted: ${candidate_relative_paths[index]}"
}

cleanup() {
	if [[ -n "$temp_dir" && -d "$temp_dir" ]]; then
		rm -rf -- "$temp_dir"
	fi
}

parse_args() {
	while [[ $# -gt 0 ]]; do
		case "$1" in
		--root)
			[[ $# -ge 2 ]] || die '--root requires a value'
			root_path=$2
			shift 2
			;;
		--collection)
			[[ $# -ge 2 ]] || die '--collection requires a value'
			collection=$2
			shift 2
			;;
		--check)
			mode='check'
			shift
			;;
		--write)
			mode='write'
			shift
			;;
		--date)
			[[ $# -ge 2 ]] || die '--date requires a value'
			date_value=$2
			shift 2
			;;
		--draft)
			[[ $# -ge 2 ]] || die '--draft requires a value'
			draft_value=$2
			shift 2
			;;
		--layout)
			[[ $# -ge 2 ]] || die '--layout requires a value'
			layout_value=$2
			shift 2
			;;
		--title)
			[[ $# -ge 2 ]] || die '--title requires a value'
			title_override=$2
			shift 2
			;;
		--description)
			[[ $# -ge 2 ]] || die '--description requires a value'
			description_override=$2
			shift 2
			;;
		--slug)
			[[ $# -ge 2 ]] || die '--slug requires a value'
			slug_override=$2
			shift 2
			;;
		--schema-file)
			[[ $# -ge 2 ]] || die '--schema-file requires a value'
			schema_file=$2
			shift 2
			;;
		--print-schema)
			mode='schema'
			shift
			;;
		--help | -h)
			usage
			exit 0
			;;
		--)
			shift
			[[ $# -eq 0 ]] || die 'unexpected positional argument'
			;;
		*)
			die "unknown option: $1"
			;;
		esac
	done
}

main() {
	local index

	require_command awk
	require_command basename
	require_command cat
	require_command chmod
	require_command cp
	require_command date
	require_command find
	require_command grep
	require_command mktemp
	require_command mv
	require_command rm
	require_command stat

	parse_args "$@"
	[[ -n "$date_value" ]] || date_value=$(date -u +%F)
	validate_schema_registry

	if [[ "$mode" == schema ]]; then
		print_schema
		return 0
	fi

	resolve_root
	validate_options
	trap cleanup EXIT
	temp_dir=$(mktemp -d "${TMPDIR:-/tmp}/format-content.XXXXXXXXXX")

	case "$collection" in
	posts) scan_collection posts ;;
	pages) scan_collection pages ;;
	all)
		scan_collection posts
		scan_collection pages
		;;
	esac

	if [[ ${#candidate_files[@]} -eq 0 ]]; then
		info 'No missing frontmatter entries. This check covers frontmatter presence only; run project schema, rendered-output, build, and test validation separately.'
		return 0
	fi

	prepare_candidates
	if [[ "$mode" == check ]]; then
		for index in "${!candidate_files[@]}"; do
			print_candidate "$index"
		done
		return 1
	fi

	for index in "${!candidate_files[@]}"; do
		write_candidate "$index"
	done
}

main "$@"
