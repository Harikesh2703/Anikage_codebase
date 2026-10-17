# ani-cli-rs Documentation Site

This directory contains the source for the [ani-cli-rs documentation website](https://vorlie.github.io/ani-cli-rs).

The site is built with [MkDocs](https://www.mkdocs.org/) using the [Material theme](https://squidfunk.github.io/mkdocs-material/).

## Local Development

To preview the site locally, you'll need Python installed.

1. **Install dependencies:**
   ```sh
   pip install mkdocs-material
   ```

2. **Run the development server:**
   ```sh
   mkdocs serve
   ```
   This will start a local server at `http://127.0.0.1:8000/`.

## Deployment

The site is automatically deployed to GitHub Pages via a GitHub Action (`.github/workflows/pages.yml`) whenever changes are pushed to the `main` branch.

## Content

The documentation source files are located in the `docs/` directory. This is the canonical source for all user and contributor documentation; the GitHub Wiki has been retired.


# ./rust-scraper/website/docs/faq.md

# Frequently Asked Questions

## Is this a fork of Bash ani-cli?

It is a standalone Rust port using Bash ani-cli as a compatibility baseline. The executable and repository are separate and use the `ani-cli-rs` name to avoid collisions.

## Are the commands the same?

Core compatibility flags and the interactive title workflow are intentionally familiar. ani-cli-rs also adds explicit scriptable subcommands and JSON output. Some platform-specific Bash features such as rofi/dmenu integration are intentionally excluded.

## Why does `download` reject an anime name?

`ani-cli-rs download SHOW_ID EPISODE` is the scriptable interface. Use:

```console
ani-cli-rs --download "anime name"
```

for interactive title/season/episode selection.

## Where do I find a show ID?

Run `ani-cli-rs search --json "title"` and use the returned provider-prefixed ID.

## Why is a season shown as another anime result?

Both catalogs commonly model seasons as separate show entries rather than one show containing a season list. Select the appropriately named result.

## Why does a download use `.part`?

It marks incomplete/resumable media. The file is renamed to `.mp4` after successful completion. See [Downloads](guides/downloads.md#why-files-use-part).

## Can I disable `.part`?

Not currently. Writing directly to the final name would make interrupted media appear complete and weaken safe resume/finalization behavior.

## Does my aria2 config work?

If present at `%USERPROFILE%\.aria2\aria2.conf` or `$HOME/.aria2/aria2.conf`, ani-cli-rs passes it explicitly. Safety-critical per-download arguments take precedence.

## Will a Linux binary built on Ubuntu work on Arch?

The official musl binary is intended to be portable across common distributions of the same CPU architecture. A normal glibc-linked build may depend on the builder's glibc version; use the musl release target for distribution.

## Why are there no macOS releases?

The project avoids consuming limited, higher-cost hosted macOS CI minutes. macOS source builds and automatic IINA playback are tested, but official assets are not promised.

## Is there an official Linux ARM64 build?

No. Linux ARM64 can be built from source, and a Cargo alias exists for contributor cross-builds, but the maintainer does not have ARM64 Linux hardware for device testing and does not publish an ARM64 release asset.

## Does Termux work?

Termux source builds are tested. ani-cli-rs requests mpv-android normally or Android VLC with `--vlc`. If the explicit activity bridge is unavailable, it uses Android's media handler through `termux-open`; the Android default or user selection then takes precedence over `--vlc`. Keep Termux running until relayed playback ends. A terminal VLC installed with `pkg install vlc` is not the Android application and is intentionally not selected.

## Why does antivirus flag the Windows executable?

It is currently unsigned and performs provider requests, local HLS relay traffic, downloads, and child-process launching. Those behaviors can trigger heuristics. Verify checksums, inspect the source, or build locally. A detection should still be evaluated rather than automatically dismissed.

## Why does one anime work while another fails?

Each episode can use different third-party hosts. Some copies are deleted, blocked, expired, or protected by changed provider protocols. ani-cli-rs cannot produce a stream when every upstream source is unavailable.

## When should I use `--ignore-host-lists`?

Use the `--ignore-host-lists` (or `-I`) flag when you encounter playback issues that might be caused by new or unrecognized streaming domains. This forces all HLS streams through the local relay regardless of the host domain, which can resolve issues with:

- New provider domains not yet in the HLS relay allowlist
- Temporary domain changes by streaming providers
- Provider switching to backup domains

```bash
ani-cli-rs --ignore-host-lists "anime title"
# or short form
ani-cli-rs -I "anime title"
```

You can also set this permanently via environment variable:

```bash
export ANI_CLI_IGNORE_HOST_LISTS=1
```

Note that forcing relay for all streams may slightly increase startup time compared to direct playback for known safe domains.

## Why does the player fail to start with "executable not found"?

ani-cli-rs now validates that the player executable exists before attempting to launch it. If mpv (or your configured player) is not installed or not in your system PATH, you'll see a clear error message with installation instructions.

Solutions:
- Install the player (mpv, VLC, etc.)
- Ensure the player directory is in your PATH
- Set the `ANI_CLI_PLAYER` environment variable to the full path
- Use the `--player` flag to specify the executable path directly

## Does `--allow-adult` bypass router filtering?

No. It only changes catalog filtering where the selected provider supplies adult metadata. DNS, FortiGuard, parental controls, antivirus, or ISP filtering still applies.

## Does ani-cli-rs require administrator/root access?

No. Official installers target per-user locations. External player/downloader installation may follow separate operating-system rules.

## Can Rust plugins be `.dll` or `.so` files?

The current roadmap prefers external executables with a versioned JSON-lines protocol. Rust has no stable ABI for safely loading arbitrary trait implementations across compiler versions.


# ./rust-scraper/website/docs/index.md

# ani-cli-rs Documentation

`ani-cli-rs` is a cross-platform Rust port of [ani-cli](https://github.com/pystardust/ani-cli). It searches two independent Anikoto catalogs, resolves native episode sources, launches desktop or Android media players, downloads direct media and HLS streams, and preserves the familiar ani-cli command-line workflow.

The executable is named `ani-cli-rs`, so it can coexist with the Bash `ani-cli`. The project also exposes an `ani_cli` Rust library.

## Start here

- **New user:** [Installation](guides/installation.md) → [Getting Started](guides/getting-started.md)
- **Looking for an option:** [CLI Reference](reference/cli.md)
- **Playback setup:** [Playback and Players](guides/playback-and-players.md)
- **Downloading:** [Downloads](guides/downloads.md)
- **Something failed:** [Troubleshooting](support/troubleshooting.md)
- **Checking a release:** [Security and Privacy](development/security.md)
- **Building or packaging:** [Building and Releasing](development/building.md)
- **Working on a provider:** [Provider Architecture](development/architecture.md), [Anikoto API/KotoCDN](development/anikoto-kotocdn.md), and [Anikoto.cz](development/anikoto-cz.md)

## Platform support

| Platform | Official binaries | Local source builds | Notes |
|---|---:|---:|---|
| Windows 10/11 x64 | Yes | Yes | Portable ZIP and optional per-user Inno Setup installer |
| Windows on ARM64 | x64 build | Yes | Windows 11 can run the published x64 build through emulation |
| Linux x86-64 | Yes | Yes | Official release uses musl for broad distribution compatibility |
| Linux ARM64 | No | Yes | Source build only; not device-tested by the maintainer |
| macOS Intel/Apple Silicon | No | Tested | Build locally; IINA is selected automatically |
| Android/Termux | No | Tested | Build locally; launches an Android media player through Termux intents |
| iSH | No | Not supported | No iOS player adapter |

## External programs

The scraper itself does not require curl, sed, OpenSSL, Botan, or fzf. Some actions use programs discovered through `PATH`:

- `mpv` for default desktop playback;
- an Android HLS-capable player through Termux intents on Android;
- VLC with `--vlc` (a preference when Termux must use its compatibility fallback);
- Syncplay with `--syncplay`;
- `aria2c` for faster direct and delegated HLS downloads;
- `yt-dlp` and FFmpeg for HLS downloads.

See [Playback and Players](guides/playback-and-players.md) and [Downloads](guides/downloads.md) for exact fallback behavior.

## Important upstream limitation

Both Anikoto catalogs and their third-party video hosts change independently. A released episode can have no usable native source because every copy is deleted, blocked, expired, or temporarily failing. ani-cli-rs reports provider-specific failures but cannot restore media that no upstream host currently serves.

## Project links

- [Repository](https://github.com/vorlie/ani-cli-rs)
- [Releases](https://github.com/vorlie/ani-cli-rs/releases)
- [Issues](https://github.com/vorlie/ani-cli-rs/issues)
- [Upstream Bash ani-cli](https://github.com/pystardust/ani-cli)
- License: GPL-3.0-only


# ./rust-scraper/website/docs/guides/installation.md

# Installation

`ani-cli-rs` can be installed directly via Cargo from [crates.io](https://crates.io/crates/ani-cli-rs), downloaded as prebuilt binaries from [GitHub Releases](https://github.com/vorlie/ani-cli-rs/releases), or built from source.

Prebuilt assets are provided for Windows x64 and Linux x86-64. Linux ARM64, tested macOS, and tested Termux users build from source or install via Cargo.

---

## Cargo (crates.io)

### As a CLI Binary
To globally install the executable:

```sh
cargo install ani-cli-rs

```

> **Note:** Ensure Cargo's binary directory (`~/.cargo/bin` or `%USERPROFILE%\.cargo\bin`) is in your system's `PATH`.

### As a Library

To add `ani-cli-rs` to your own Rust project:

```sh
cargo add ani-cli-rs

```

Or add it to your `Cargo.toml`:

```toml
[dependencies]
ani-cli-rs = "0.9.6"

```

---

## Windows

### Portable installation

Open PowerShell and run:

```powershell
Invoke-WebRequest https://raw.githubusercontent.com/vorlie/ani-cli-rs/master/scripts/install.ps1 -OutFile install.ps1
.\install.ps1
Remove-Item .\install.ps1

```

The installer:

1. reads the latest GitHub release;
2. downloads the x64 Windows ZIP and its `.sha256` file;
3. verifies SHA-256 using .NET cryptography, including on older PowerShell versions without `Get-FileHash`;
4. installs `ani-cli-rs.exe` to `%USERPROFILE%\.local\bin` by default;
5. adds that directory to the user `PATH` unless `-NoPathUpdate` is supplied.

Open a new terminal after installation so it receives the updated user `PATH`.

Custom directory:

```powershell
.\install.ps1 -InstallDirectory "D:\Tools\bin"

```

Skip the `PATH` update:

```powershell
.\install.ps1 -NoPathUpdate

```

### Inno Setup wizard

If the release contains the setup asset:

```powershell
.\install.ps1 -UseSetup

```

This launches a per-user installer with an uninstall entry. It does not require administrator privileges. The portable and Setup installations use different installation management, so use the matching uninstall method.

---

## Linux

```sh
curl -fsSL https://raw.githubusercontent.com/vorlie/ani-cli-rs/master/scripts/install.sh -o install.sh
sh install.sh
rm install.sh

```

The script installs the official Linux x86-64 archive, verifies its published SHA-256 checksum, installs to `$HOME/.local/bin` by default, and adds that directory to `$HOME/.profile` when needed. On Linux ARM64 it exits with source-build instructions because no official ARM64 asset is published.

Custom locations:

```sh
ANI_CLI_RS_INSTALL_DIR="$HOME/bin" ANI_CLI_RS_PROFILE="$HOME/.bashrc" sh install.sh

```

Official Linux archives use musl so one release can work across common distributions such as Ubuntu, Debian, Arch, Fedora, and Alpine. Kernel and CPU architecture compatibility still apply.

### Linux ARM64

Linux ARM64 is source-buildable but is not device-tested by the maintainer and has no official release archive:

```sh
git clone https://github.com/vorlie/ani-cli-rs.git
cd ani-cli-rs
cargo build --release --locked

```

The local `cargo release-linux-arm64` alias is intended for contributors with a suitable cross-linker or ARM64 build environment; its existence does not indicate an official binary.

---

## macOS

No official macOS release assets are provided. The source build and automatic IINA selection have been tested. Install the Rust toolchain and build locally:

```sh
git clone https://github.com/vorlie/ani-cli-rs.git
cd ani-cli-rs
cargo build --release --locked

```

The binary is placed at `target/release/ani-cli-rs`. Copy it to a directory on your `PATH` if desired.

IINA is the default player on macOS. Install it with `brew install --cask iina` and ensure its `iina` command is on `PATH`.

---

## Android with Termux

Termux source builds are tested, but no Android release binary is published. Install a current Termux build from a trusted source, then run:

```sh
pkg update
pkg install rust
git clone https://github.com/vorlie/ani-cli-rs.git
cd ani-cli-rs
cargo build --release --locked
install -Dm755 target/release/ani-cli-rs "$PREFIX/bin/ani-cli-rs"

```

Install an Android HLS-capable video player such as mpv-android or VLC. Do not use `pkg install vlc` for this integration: that installs a terminal VLC build rather than the Android application.

Run `ani-cli-rs "title"` to request mpv-android or `ani-cli-rs --vlc "title"` to request Android VLC. ani-cli-rs searches for `termux-am-starter`, `termux-am`, and `am`, in that order. If the explicit activity bridge is incompatible with the installed Termux app, it falls back to `termux-open` with the stream's media type, then `termux-open-url`. On this fallback path Android's chosen/default media handler takes precedence, so `--vlc` cannot guarantee VLC. `ANI_CLI_PLAYER` can override the activity-launcher executable if a device requires a different path.

---

## Build from source on any supported platform

Install a current stable Rust toolchain, then:

```console
git clone https://github.com/vorlie/ani-cli-rs.git
cd ani-cli-rs
cargo build --release --locked

```

Windows output: `target\release\ani-cli-rs.exe`

Unix output: `target/release/ani-cli-rs`

Rust edition 2024 requires a recent toolchain. If Cargo says the `edition2024` feature is unavailable, update through rustup and verify that the rustup binaries appear before a distribution-installed `/usr/bin/cargo` in `PATH`.

---

## Uninstall

### Cargo

```sh
cargo uninstall ani-cli-rs

```

### Portable Windows

```powershell
Invoke-WebRequest https://raw.githubusercontent.com/vorlie/ani-cli-rs/master/scripts/uninstall.ps1 -OutFile uninstall.ps1
.\uninstall.ps1
Remove-Item .\uninstall.ps1

```

### Linux

```sh
curl -fsSL https://raw.githubusercontent.com/vorlie/ani-cli-rs/master/scripts/uninstall.sh -o uninstall.sh
sh uninstall.sh
rm uninstall.sh

```

For an Inno Setup installation, use Windows Installed Apps or the generated uninstaller.

---

## Verify the installation

```console
ani-cli-rs --version
ani-cli-rs --help

```

If the command is not found, see [Troubleshooting: installed but not found](https://www.google.com/search?q=../support/troubleshooting.md%23installed-but-command-not-found).



# ./rust-scraper/website/docs/guides/getting-started.md

# Getting Started

## Play an anime interactively

```console
ani-cli-rs "frieren"
```

The normal flow is:

1. search the selected Anikoto catalog;
2. choose the correct anime entry or season;
3. choose an episode;
4. resolve supported sources and requested quality;
5. launch the platform player: mpv, IINA, or an Android player from Termux;
6. use the post-launch menu to choose next, replay, previous, another episode, or another quality.

If the query is omitted, ani-cli-rs prompts for it:

```console
ani-cli-rs
```

## Subbed, dubbed, and adult results

```console
ani-cli-rs --dub "cowboy bebop"
ani-cli-rs --allow-adult "search query"
```

`--dub` changes the translation catalog. `--allow-adult` permits adult-marked search results; it does not disable network or router filtering.

## Quality

```console
ani-cli-rs -q best "title"
ani-cli-rs -q worst "title"
ani-cli-rs -q 720p "title"
```

An explicit resolution falls back to the best resolved stream when that exact resolution is absent.

## Choose episodes without a prompt

```console
ani-cli-rs -e 1 "title"
ani-cli-rs -e 2-5 "title"
ani-cli-rs -e "1 3 5.5" "title"
```

`-r/--range` is an alias of `-e/--episode`. Fractional episode labels are preserved when the selected catalog publishes them.

## Multiple interactive episodes

Choose **Select multiple episodes** in the episode picker, or open it directly:

```console
ani-cli-rs --multi-selection "title"
```

Use Space to toggle entries and Enter to confirm.

## Download by title

```console
ani-cli-rs --download "anime title"
```

Select the anime/season and episodes. Version 0.6.0 and newer preflight every selected episode before starting the first transfer. See [Downloads](downloads.md).

## Continue from history

```console
ani-cli-rs --continue
```

Select a history entry and ani-cli-rs chooses its next published episode. History is compatible with Bash ani-cli's tab-separated `ani-hsts` format.

## Keyboard navigation

| Key | Fuzzy anime/episode menus | Ordinary action menus |
|---|---|---|
| Arrow keys | Move | Move |
| Tab / Shift+Tab | Down / up | Down / up |
| Type | Filter results | — |
| Space | Toggle in multi-select | Select |
| Enter | Select/confirm | Select |
| Escape | Go back | Cancel/quit |
| `j` / `k` | Typed as filter text | Down / up |
| `h` / `l` | Typed as filter text | Previous / next page |
| `q` | Typed as filter text | Cancel/quit |

The visible Back row has the same effect as Escape. In fuzzy search, `q` remains available for titles containing that character.

## Next episode schedule

```console
ani-cli-rs --nextep-countdown "anime title"
```

This displays the next scheduled Japanese/raw and subtitled release timestamps from AnimeSchedule, then exits.


# ./rust-scraper/website/docs/guides/configuration.md

# Configuration and History

ani-cli-rs uses command-line options for one-off choices and environment variables for defaults. It does not currently maintain a general application configuration file.

## Environment variables

| Variable | Purpose |
|---|---|
| `ANI_CLI_MODE` | Default translation mode: `sub` or `dub` |
| `ANI_CLI_PLAYER` | Desktop player executable, or Android activity-launcher path in Termux |
| `ANI_CLI_DOWNLOAD_DIR` | Compatibility-mode download directory |
| `ANI_CLI_QUALITY` | Default quality (`best`, `worst`, or resolution) |
| `ANI_CLI_HIST_DIR` | Directory containing the `ani-hsts` history file |
| `ANI_CLI_ALLOW_ADULT` | Enable adult search results |
| `ANI_CLI_MULTI_SELECTION` | Open episode multi-select directly |
| `ANI_CLI_NO_DETACH` | Wait for the player |
| `ANI_CLI_EXIT_AFTER_PLAY` | Propagate attached player failures |
| `ANI_CLI_IGNORE_HOST_LISTS` | Force all streams through HLS relay regardless of host allowlist |
| `ANI_CLI_RS_INSTALL_DIR` | Installer/uninstaller target directory |
| `ANI_CLI_RS_PROFILE` | Unix profile modified by install/uninstall scripts |
| `ANI_CLI_RS_PROVIDER` | Changes the default provider used by `ani-cli-rs`. Available providers: `anikoto`/`anikoto2` |

Boolean variables recognize `1`, `true`, or `yes` where consumed as application booleans.

## PowerShell examples

Current process only:

```powershell
$env:ANI_CLI_QUALITY = "720p"
$env:ANI_CLI_DOWNLOAD_DIR = "$HOME\Downloads\Anime"
ani-cli-rs "title"
```

Persistent user variable:

```powershell
[Environment]::SetEnvironmentVariable("ANI_CLI_QUALITY", "720p", "User")
```

Open a new terminal after changing persistent variables.

## Unix shell examples

One command:

```sh
ANI_CLI_QUALITY=720p ani-cli-rs "title"
```

Persistent shell configuration:

```sh
export ANI_CLI_QUALITY=720p
export ANI_CLI_DOWNLOAD_DIR="$HOME/Downloads/Anime"
```

Place exports in the profile loaded by your shell.

## History format

The `ani-hsts` file uses the Bash ani-cli-compatible tab-separated format:

```text
EPISODE<TAB>SHOW_ID<TAB>TITLE
```

Example:

```text
4	SyR2K6bGYfKSE6YMm	Example Anime
```

One entry is retained per show ID. Successful playback/download updates the current episode through an atomic temporary-file rewrite.

## History location

For predictable sharing with Bash ani-cli, set:

```powershell
$env:ANI_CLI_HIST_DIR = "$HOME\.local\state\ani-cli"
```

```sh
export ANI_CLI_HIST_DIR="$HOME/.local/state/ani-cli"
```

ani-cli-rs appends `ani-hsts` to that directory. Without the variable, the `directories` crate chooses the platform-native application state directory, falling back to local application data when the OS has no dedicated state directory.

## Continue and clear

```console
ani-cli-rs --continue
ani-cli-rs --delete
```

`--continue` lists entries that have a published next episode. `--delete` rewrites the history as empty; it does not delete downloaded media.

## Provider cache

Successful catalog and series responses are cached in memory for five minutes. The cache is process-local and contains no media files or persistent provider credentials.

## Logging

```powershell
$env:RUST_LOG = "warn"
ani-cli-rs "title"
```

```sh
RUST_LOG=debug ani-cli-rs "title"
```

Debug logs can expose provider names, response categories, and local executable paths. The application redacts complete signed provider URLs in routine scraper diagnostics, but review logs before sharing them publicly.


# ./rust-scraper/website/docs/guides/downloads.md

# Downloads

Both Anikoto providers use the same preflight and downloader fallback order. Select Anikoto.cz with `--provider anikoto2`; self-identifying `anikoto:` and `anikoto2:` IDs route automatically.

MegaPlay/KotoCDN HLS is passed through ani-cli-rs's tokenized loopback relay for the lifetime of yt-dlp/FFmpeg so wrapped transport-stream fragments can be consumed without transcoding.

## Interactive download by anime name

```console
ani-cli-rs --download "anime title"
```

Catalogs generally expose seasons as separate search results. Select the intended anime/season entry, then one or more episodes.

From version 0.6.0, ani-cli-rs preflights the complete selection before starting a transfer:

1. resolve each episode sequentially;
2. discard streams not marked downloadable;
3. apply the requested quality independently to each episode;
4. if every episode resolves, cache the selected links and start downloads in episode order;
5. if an episode is unavailable, start no downloads and update no history.

Prompted terminal sessions return to the episode picker after availability failures. Explicit `-e/--episode`, `-r/--range`, continuation selections, and non-terminal runs fail instead of prompting.

Preflight means provider resolution, not an extra HTTP `HEAD` request. Some hosts reject probes that are not real media requests.

## Scriptable download by show ID

```console
ani-cli-rs download SHOW_ID 1 --title "Anime title" --output ./Downloads
```

This subcommand does not search by name and does not open selectors. Obtain the provider-prefixed ID with `search --json`.

For automation, `links --json` can also be used to inspect the exact stream selected for an episode, including subtitle tracks exposed by the provider.

```console
ani-cli-rs links SHOW_ID 1 --mode sub -q 1080p --json
```

The JSON output contains the resolved video URL, resolution, HLS status, provider, downloadability, required request headers, and any subtitle tracks exposed by the provider.

Resolved URLs may be signed or temporary. Avoid posting complete `links --json` output in public issues.

## Quality selection

```console
ani-cli-rs -d -q best "title"
ani-cli-rs -d -q worst "title"
ani-cli-rs -d -q 720p "title"
```

If an explicit resolution is missing, quality selection falls back to the best available downloadable stream for that episode.

For scriptable downloads, quality can be passed directly to the `download` or `links` subcommand:

```console
ani-cli-rs download SHOW_ID 1 -q 1080p --title "Anime title"
ani-cli-rs links SHOW_ID 1 -q 1080p --json
```

## Download directory

Compatibility workflow:

```powershell
$env:ANI_CLI_DOWNLOAD_DIR = "$HOME\Downloads\Anime"
ani-cli-rs -d "title"
```

```sh
ANI_CLI_DOWNLOAD_DIR="$HOME/Downloads/Anime" ani-cli-rs -d "title"
```

Scriptable workflow uses `--output`.

## Downloader order

### Direct media

1. `aria2c` with parallel connections and resume support;
2. built-in Rust streaming downloader if aria2c is missing or fails.

Providers known to reject excessive parallel requests, including Mp4Upload, receive a lower connection limit.

### HLS

1. yt-dlp with aria2c as external downloader when both exist;
2. yt-dlp without aria2c;
3. FFmpeg;
4. error if none succeeds.

Install the tools through the operating system and ensure their executable names are in `PATH`.

## Subtitle tracks

Subtitle availability depends on the provider and the selected stream. Some streams expose external subtitle tracks, while others provide no subtitle metadata at all.

When subtitle tracks are exposed, `links --json` includes them in the `subtitles` array:

```json
{
  "label": "English (CR English)",
  "url": "https://example.invalid/subtitles/track.vtt",
  "default": true
}
```

The exact URL is provider-generated and may be temporary.

### Anikoto subtitle tracks

Native MegaPlay sources can provide several external subtitle tracks. ani-cli-rs attempts to download every subtitle track exposed by the selected source; there is intentionally no language picker before downloading.

When FFmpeg is available, downloaded subtitles are embedded into the final MP4 as selectable `mov_text` tracks. Each track receives:

* its complete provider label as the track title;
* an ISO 639 language tag when the provider label identifies a supported language;
* the provider-designated default status, or the first track as a fallback default.

Language tags allow players such as VLC to display `English`, `Polish`, or another language instead of generic names such as `Track 1`. Unknown provider labels remain embedded with their original title and an undetermined-language tag.

If FFmpeg is unavailable or subtitle muxing fails, the completed video is preserved and downloaded subtitles remain beside it as sidecar files. The CLI reports this fallback.

Streams without external subtitle metadata are downloaded unchanged.

## Downloading a subtitle separately

If a provider exposes subtitles but the normal download does not produce the subtitle file you want, use `links --json` to retrieve the subtitle metadata and download the track separately.

For example, in PowerShell:

```powershell
$links = ani-cli-rs links "SHOW_ID" 10 --mode sub -q 1080p --json |
    ConvertFrom-Json

$link = $links |
    Where-Object { $_.downloadable -and $_.resolution -eq "1080p" } |
    Select-Object -First 1

if ($null -eq $link) {
    throw "No downloadable 1080p stream was exposed."
}

$subtitle = $link.subtitles |
    Where-Object { $_.label -match '^English' } |
    Select-Object -First 1

if ($null -eq $subtitle) {
    throw "No English subtitle was exposed by the provider."
}

curl.exe -L `
    -H "Referer: $($link.headers.referer)" `
    -H "User-Agent: $($link.headers.extra.'User-Agent')" `
    -o "Episode 10.en.vtt" `
    $subtitle.url
```

The important part is using the request headers returned alongside the stream. Some subtitle hosts reject requests that omit the provider's `Referer` or `User-Agent`.

This approach is useful when you want to choose a specific language rather than keeping every track exposed by the provider.

## WebVTT and SRT sidecars

Providers may expose subtitles as WebVTT (`.vtt`). The format does not need to be converted for normal playback: Jellyfin and modern media players can use WebVTT sidecars directly.

For example:

```text
Kimi ga Shinu made Koi wo Shitai Episode 10.mp4
Kimi ga Shinu made Koi wo Shitai Episode 10.en.vtt
```

For broader compatibility or archival purposes, WebVTT can be converted to SRT with FFmpeg:

```console
ffmpeg -i "Episode 10.en.vtt" "Episode 10.en.srt"
```

A sidecar subtitle is often the simplest option when the original video should remain untouched.

## Embedding subtitles into MKV

For a library such as Jellyfin, you can also mux the video and subtitles into an MKV container.

```console
ffmpeg -i "Episode 10.mp4" ^
       -i "Episode 10.en.vtt" ^
       -map 0 -map 1 ^
       -c copy ^
       -c:s srt ^
       -metadata:s:s:0 language=eng ^
       -metadata:s:s:0 title="English" ^
       "Episode 10.mkv"
```

On PowerShell, the same command can be written using backticks:

```powershell
ffmpeg -i "Episode 10.mp4" `
       -i "Episode 10.en.vtt" `
       -map 0 -map 1 `
       -c copy `
       -c:s srt `
       -metadata:s:s:0 language=eng `
       -metadata:s:s:0 title="English" `
       "Episode 10.mkv"
```

The video and audio streams are copied without re-encoding. Only the subtitle stream is converted to the Matroska-compatible SRT format.

For multiple subtitle files, add another `-i`, `-map`, and subtitle metadata entry for each track.

Do not use `mov_text` when creating an MKV. `mov_text` is an MP4 subtitle codec; MKV should use formats such as SRT or ASS.

## Embedding subtitles into MP4

If keeping MP4 is important, WebVTT can instead be converted to MP4-compatible `mov_text`:

```powershell
ffmpeg -i "Episode 10.mp4" `
       -i "Episode 10.en.vtt" `
       -map 0 -map 1 `
       -c copy `
       -c:s mov_text `
       -metadata:s:s:0 language=eng `
       -metadata:s:s:0 title="English" `
       "Episode 10.subbed.mp4"
```

This also copies the original video and audio without re-encoding.

## Why files use `.part`

Direct downloads are written as `Title Episode N.mp4.part`. After successful completion, ani-cli-rs atomically renames the file to `Title Episode N.mp4`.

This is intentional:

* incomplete media never looks finished;
* interrupted downloads can resume;
* the final filename appears only after successful finalization.

There is currently no option to write directly to the final name. If `.part` remains, the transfer was interrupted or finalization failed. Rerun the same download to resume when the provider link and downloader permit it.

Do not confuse the media `.part` file with aria2's own temporary `.aria2` control file.

## aria2 configuration

ani-cli-rs explicitly loads an existing config from:

* Windows: `%USERPROFILE%\.aria2\aria2.conf`
* Linux/macOS: `$HOME/.aria2/aria2.conf`

The file is optional. Required command-line arguments for output naming, resume behavior, connection safety, and provider headers override conflicting config entries.

Example configuration:

```ini
console-log-level=warn
summary-interval=0
file-allocation=none
```

Do not force a global split/connection count that conflicts with hosts enforcing low parallel limits.

## HTTP 403 from aria2

A few failed connection attempts do not necessarily mean the whole aria2 download failed; segmented downloads can retry and still complete. Check the final status and whether ani-cli-rs successfully renamed `.part` to `.mp4`.

Persistent 403 errors can mean:

* the signed URL expired;
* the provider binds the URL to another IP;
* required referrer/origin headers were lost;
* the provider rejects the configured connection count.

Rerun source resolution rather than reusing an old URL. If aria2 fails, ani-cli-rs attempts its documented fallback where possible.


# ./rust-scraper/website/docs/guides/playback-and-players.md

# Playback and Players

Anikoto API/MegaPlay is the default catalog. Select the independent Anikoto.cz catalog with `--provider anikoto2` or `ANI_CLI_PROVIDER=anikoto2`. For KotoCDN HLS from either provider, ani-cli-rs starts a loopback-only relay and remains attached to the player until it exits; this translates confirmed PNG-wrapped transport-stream segments.

## mpv

mpv is the default player on Linux and Windows. Install it through your operating system and ensure `mpv` (`mpv.exe` on Windows) is in `PATH`.

```console
ani-cli-rs "title"
```

ani-cli-rs passes the stream URL, media title, and provider referrer as separate process arguments. mpv receives `--tls-verify=no` for compatibility with third-party media hosts.

Override the executable:

```powershell
$env:ANI_CLI_PLAYER = "C:\Program Files\mpv\mpv.exe"
ani-cli-rs "title"
```

```sh
ANI_CLI_PLAYER=/opt/mpv/bin/mpv ani-cli-rs "title"
```

## IINA on macOS

IINA is the tested default player on macOS. Install it with `brew install --cask iina` and ensure its `iina` command is on `PATH`. ani-cli-rs passes provider headers and subtitles through IINA's mpv-compatible options.

`ANI_CLI_PLAYER` overrides the platform's default executable, so it must point to an IINA-compatible command on macOS or an mpv-compatible command on Linux and Windows.

## VLC

```console
ani-cli-rs --vlc "title"
```

VLC receives `--play-and-exit`, the media title, and `--http-referrer` when required. The executable defaults to `vlc.exe` on Windows and `vlc` elsewhere.

## Android players from Termux

On Android, ani-cli-rs launches an installed Android player through a `VIEW` intent. Normal playback requests mpv-android (`is.xyz.mpv`); `--vlc` requests the Android VLC application instead of a terminal VLC executable.

Ensure the standard Termux tools are installed:

```sh
pkg install termux-tools
```

ani-cli-rs searches for `termux-am-starter`, `termux-am`, and `am` and first attempts to target the requested Android player directly. Some Termux app/package combinations expose a socket-backed `termux-am` that cannot connect. In that case ani-cli-rs automatically uses media-typed `termux-open`, falling back again to `termux-open-url` when necessary. Android's chosen/default media handler controls which app opens on this fallback path; `--vlc` is therefore a preference, not a guarantee. The media type helps Android choose a video player instead of a web browser.

HLS playback is routed through ani-cli-rs's loopback relay on Android. After launching the player, the terminal intentionally waits:

```text
Opened the Android player. Return to Termux and press Enter after playback ends.
```

This keeps protected playlists, segments, and provider headers available to the Android app. Return to Termux and press Enter only after playback ends; the normal next/replay/previous menu then continues. Non-interactive Android HLS playback is rejected because exiting immediately would destroy the required relay.

Android intent APIs do not accept the same mpv/VLC command-line options as desktop executables. For relayed HLS, ani-cli-rs wraps provider WebVTT/SRT tracks in timed subtitle media playlists and publishes them as standard HLS renditions. Select the track from the Android player's subtitle menu if it is not enabled automatically. Device testing confirmed relayed playback and selectable external subtitles with mpv-android, VLC, Amnis, and Samsung Video Player. Compatibility can still vary between Android versions and player builds. Embedded and burned-in subtitles remain unchanged.

## Syncplay

```console
ani-cli-rs --syncplay "title"
```

The executable defaults to `syncplay.exe` on Windows and `syncplay` elsewhere. ani-cli-rs supplies the stream and mpv-compatible referrer/title options to Syncplay.

Syncplay coordinates playback state; it does not make an unavailable provider source available.

## Attached and detached playback

By default the player is detached after it starts. Use:

```console
ani-cli-rs --no-detach "title"
```

Attached playback allows ani-cli-rs to wait for player completion before continuing. Use `--exit-after-play` when the player's non-zero exit should also fail the CLI command.

Environment equivalents:

```text
ANI_CLI_NO_DETACH=true
ANI_CLI_EXIT_AFTER_PLAY=true
```

Accepted true values are `1`, `true`, and `yes`, case-insensitively.

## Interactive post-playback controls

After a single episode is launched in an interactive terminal, the action menu can include:

- Next episode;
- Replay;
- Previous episode;
- Select another episode;
- Change quality;
- Quit.

Unavailable directions are hidden. Multi-episode batches, downloads, non-terminal runs, and `--exit-after-play` do not open this menu.

## Referrer-related failures

Many media hosts return HTTP 403 without the correct `Referer` or `Origin`. `StreamLink` carries these headers from resolution into player arguments. If a URL works in ani-cli-rs but not when pasted into a browser, that does not necessarily indicate a bug: the browser request may lack the required header, or the URL may be bound to an IP/expiry time.

For diagnosis, use `links --json` but redact signed query strings before sharing output.


# ./rust-scraper/website/docs/reference/cli.md

# CLI Reference

There are two interfaces:

- **Compatibility workflow:** `ani-cli-rs [OPTIONS] [QUERY]...` searches by title and may prompt interactively.
- **Scriptable subcommands:** `search`, `episodes`, `links`, `play`, and `download` use explicit arguments and stable text/JSON output.

Run `ani-cli-rs --help` or `ani-cli-rs <COMMAND> --help` for the authoritative help generated by the installed version.

## Compatibility options

| Option | Meaning |
|---|---|
| `-c`, `--continue` | Select the next unwatched episode from history |
| `-d`, `--download` | Download instead of launching a player |
| `-D`, `--delete` | Clear history and exit |
| `-s`, `--syncplay` | Launch through Syncplay |
| `-S`, `--select-nth N` | Select the one-based search/history result without a menu |
| `-q`, `--quality VALUE` | `best`, `worst`, or a resolution such as `1080p` |
| `-v`, `--vlc` | Use VLC instead of mpv |
| `-e`, `--episode VALUE` | Episode, whitespace-separated episodes, or range |
| `-r`, `--range VALUE` | Alias for `--episode` |
| `--multi-selection` | Open the multi-select episode picker directly |
| `--dub` | Use the dubbed catalog |
| `-a`, `--allow-adult` | Permit adult-marked search results |
| `--no-detach` | Keep the player attached and wait for exit |
| `--exit-after-play` | Treat an attached player's failure as a CLI failure |
| `-I`, `--ignore-host-lists` | Force all streams through HLS relay regardless of host allowlist |
| `-N`, `--nextep-countdown` | Show release schedule and exit |
| `-U`, `--update` | Install the latest release |
| `-p`, `--provider VALUE` | Select `anikoto` (default) or `anikoto2` (Anikoto.cz) |
| `-V`, `--version` | Print the version |

Options may appear before, between, or after query words where Clap can interpret them unambiguously.

## Episode expressions

```text
1
1 3 5
2-6
2-6 8 10.5
latest
```

Only episodes present in the selected show's catalog are accepted. Numeric and fractional values are ordered numerically.

## `search`

```console
ani-cli-rs search [--mode sub|dub] [--allow-adult] [--json] "QUERY"
```

Text output is tab-separated and begins with the show ID. JSON output is recommended for automation.

```console
ani-cli-rs search --json "frieren"
ani-cli-rs --provider anikoto2 search --json "black torch"
```

## Show IDs

The scriptable commands do not search anime names. They require the ID returned by `search`.

Anikoto API IDs begin with `anikoto:` and Anikoto.cz IDs begin with `anikoto2:`. Both route automatically. A raw numeric Anikoto API series ID is accepted with `--provider anikoto`; a raw Anikoto.cz slug is accepted with `--provider anikoto2`. `--title` changes a player title or output filename; it is not a search query.

## `episodes`

```console
ani-cli-rs episodes SHOW_ID [--mode sub|dub] [--json]
```

Prints available episode labels in numeric order.

## `links`

```console
ani-cli-rs links SHOW_ID EPISODE [--mode sub|dub] [-q QUALITY] [--json]
```

Without `-q`, all resolved links are returned in provider/quality preference order. JSON includes URLs, resolution, HLS status, provider, downloadability, and required request headers.

Resolved URLs may be signed and temporary. Do not publish complete JSON output in issues.

## `play`

```console
ani-cli-rs play SHOW_ID EPISODE [OPTIONS]
```

Options include `--mode`, `-q/--quality`, `--title`, `--player`, `--no-detach`, and `--ignore-host-lists`. `--player` is an executable path, not a shell command.

## `download`

```console
ani-cli-rs download SHOW_ID EPISODE [OPTIONS]
```

Options include `--mode`, `-q/--quality`, `--title`, and `--output`. This subcommand is intentionally non-interactive and downloads one episode. Use `ani-cli-rs -d "title"` for title, season, and multi-episode selection.

## Maintenance

```console
ani-cli-rs update --check
ani-cli-rs update
```

## Exit behavior

- Argument and validation errors return a non-zero exit code.
- Scriptable commands never open fuzzy selectors.
- Canceling an ordinary interactive menu is not treated as a crash.
- Detached player startup success does not mean playback later succeeded.
- `--no-detach --exit-after-play` allows an attached player failure to propagate.


# ./rust-scraper/website/docs/development/anikoto-kotocdn.md

# Anikoto, MegaPlay, and KotoCDN Resolution

Contributor notes for the native Anikoto implementation in ani-cli-rs 0.7.0, with comparisons to AniPlay 1.16.2.

Last verified: 2026-07-22

## Purpose

This document explains how an Anikoto catalog result becomes a native MegaPlay stream and how KotoCDN's disguised HLS segments are made usable by ordinary desktop players and download tools.

ani-cli-rs is native-only: it does not expose MegaPlay iframe URLs as playable CLI streams. Candidate embeds are used only to obtain the numeric player ID needed by `stream/getSources`. If all native candidates fail, the command returns a provider-aware unavailable-source error.

It also describes why the native stream is needed for Watch Together and which parts of the workflow can be reused when adding another provider.

Although this document follows AniPlay's implementation, it is also intended as a reference for other projects integrating Anikoto, MegaPlay, KotoCDN, or a similar catalog-to-embed-to-native-media workflow. The provider layering, identifier strategy, fallback model, header handling, diagnostics, security guidance, and integration checklist are project-agnostic. AniPlay-specific Electron and Watch Together code should be treated as worked examples and adapted to the target application's runtime and player architecture.

The ani-cli-rs implementation lives primarily in:

- `src/anikoto.rs`
- `src/hls_relay.rs`
- `src/main.rs`
- `src/player.rs`
- `src/download.rs`

Later sections also discuss the related AniPlay implementation as a worked Electron/Watch Together reference. Those paths are:

- `ani-cli-gui/electron/providers/anikoto.ts`
- `ani-cli-gui/electron/media-headers.ts`
- `ani-cli-gui/electron/main.ts`
- `ani-cli-gui/src/lib/watch-together-content.ts`
- `ani-cli-gui/src/pages/PlayerPage.tsx`

## Important terminology

These services have different responsibilities:

| Layer | Current service | Purpose |
| --- | --- | --- |
| Metadata/catalog | Anikoto API | Recent titles, series metadata, episode numbers, embed IDs, and embed URLs |
| Player/embed | MegaPlay | Hosts the iframe player and exposes player source metadata |
| Media delivery | KotoCDN and other MegaPlay-associated hosts | Serves HLS manifests, segments, and subtitles |
| Coordination | AniPlay Watch Together Worker | Shares stable content identifiers and playback state, but never media URLs |

KotoCDN should not be treated as an anime catalog provider. It is one possible delivery host returned by MegaPlay. Delivery domains can change independently of Anikoto and MegaPlay.

## Upstream documentation

- Anikoto API: <https://anikotoapi.site/>
- MegaPlay API and embed documentation: <https://megaplay.buzz/api>

The documented Anikoto endpoints are:

```text
GET https://anikotoapi.site/recent-anime?page=PAGE&per_page=COUNT
GET https://anikotoapi.site/series/SERIES_ID
```

The documented MegaPlay embed forms are:

```text
https://megaplay.buzz/stream/s-2/EPISODE_EMBED_ID/sub
https://megaplay.buzz/stream/s-2/EPISODE_EMBED_ID/dub
https://megaplay.buzz/stream/ani/ANILIST_ID/EPISODE/sub
https://megaplay.buzz/stream/mal/MAL_ID/EPISODE/sub
```

MegaPlay documents iframe playback and outbound `postMessage` progress events. The native `stream/getSources` request described below is an observed implementation detail, not a stable public API guarantee. Treat it as replaceable provider-specific code.

## Complete resolution flow

```text
Search term
    |
    +-- Anikoto /recent-anime
    |
    +-- AniList search metadata
            |
            v
Encoded AniPlay Anikoto ID
            |
            +-- Anikoto /series/{id}
            |       |
            |       +-- episode number
            |       +-- episode_embed_id
            |       +-- embed_url.sub / embed_url.dub
            |
            v
Ordered MegaPlay embed candidates
            |
            +------------------------------+
            |                              |
            v                              v
Return iframe fallback              Fetch embed HTML
                                           |
                                           +-- extract data-id
                                           |
                                           v
                              GET /stream/getSources?id=...
                                           |
                                           +-- sources/file URL
                                           +-- caption tracks
                                           +-- intro/outro metadata
                                           |
                                           v
                               Native HLS/MP4 StreamLink
                                           |
                                           v
                           Apply MegaPlay/KotoCDN headers
```

The iframe is retained even when native extraction succeeds. Normal playback can therefore fall back to the provider player, while Watch Together can select the controllable native source.

## 1. Searching and creating a stable internal ID

AniPlay combines two result sources:

- `GET /recent-anime` from Anikoto;
- AniList GraphQL search results.

Anikoto results provide the provider's series ID. AniList improves title, image, episode-count, MAL-ID, and AniList-ID coverage. Results are merged and deduplicated by AniList ID when possible, then by normalized title.

AniPlay stores the available identifiers in a Base64URL-encoded JSON object prefixed with `anikoto:`:

```json
{
  "anilistId": "183661",
  "malId": "60226",
  "anikotoId": "8370",
  "title": "Example title",
  "episodes": 12
}
```

Conceptually:

```ts
const showId = `anikoto:${Buffer.from(JSON.stringify(metadata), 'utf8').toString('base64url')}`
```

This avoids depending on only one mapping system. A result may have an Anikoto series ID, AniList ID, MAL ID, or some combination of them.

Numeric IDs are also accepted by the decoder and interpreted as Anikoto series IDs for compatibility.

## 2. Loading the episode list

When an Anikoto series ID exists, AniPlay requests:

```text
GET https://anikotoapi.site/series/{anikotoId}
```

For each episode it reads:

```json
{
  "number": 1,
  "episode_embed_id": "835403",
  "embed_url": {
    "sub": "https://megaplay.buzz/stream/s-2/835403/sub",
    "dub": "https://megaplay.buzz/stream/s-2/835403/dub"
  }
}
```

Field names are normalized defensively because provider payloads can vary. Episode numbers are converted to strings and sorted numerically.

If `/series/{id}` is unavailable but AniList supplied an episode count, AniPlay can still produce a synthetic `1..N` episode list and try the AniList/MAL embed routes.

Search and series requests are cached for five minutes. Failed promises are removed from the cache so a temporary upstream failure does not poison later attempts.

## 3. Building embed candidates

For a selected episode and language, AniPlay creates candidates in this order:

1. the explicit `embed_url.sub` or `embed_url.dub` returned by Anikoto;
2. `/stream/s-2/{episode_embed_id}/{language}`;
3. `/stream/ani/{anilistId}/{episode}/{language}`;
4. `/stream/mal/{malId}/{episode}/{language}`.

Duplicate URLs are removed without changing the order.

The explicit series response is preferred because it is the closest mapping to the provider's current catalog. AniList and MAL routes are fallbacks; MegaPlay warns that not every title is mapped through both external databases.

## 4. Preserving the iframe fallback

The first usable candidate becomes an embed `StreamLink`:

```ts
{
  url: embedUrl,
  resolution: 'Embed',
  hls: false,
  provider: 'MegaPlay · Embed',
  downloadable: false,
  embed: true,
}
```

This fallback is important because native extraction is more fragile than the documented embed interface. If the provider changes its internal player or blocks native access, users can still use the iframe.

## 5. Extracting MegaPlay's internal source ID

Native resolution begins by requesting the embed page with a browser User-Agent and a MegaPlay referer:

```http
GET /stream/s-2/{episode_embed_id}/{language}
Host: megaplay.buzz
Referer: https://megaplay.buzz/
User-Agent: Mozilla/5.0 ...
Accept: text/html,application/json,text/plain,*/*
```

The current player markup contains a numeric `data-id` on the player element:

```html
<div id="megaplay-player" data-id="124325"></div>
```

AniPlay extracts it with a deliberately narrow expression:

```ts
/\bdata-id=["'](\d+)["']/i
```

Do not assume that the catalog's `episode_embed_id` and this internal `data-id` are the same. They belong to different layers and can have different values.

## 6. Requesting the source metadata

The internal ID is passed to the player source endpoint:

```text
GET https://megaplay.buzz/stream/getSources?id={dataId}
```

Required request context:

```http
Accept: application/json,text/plain,*/*
Referer: https://megaplay.buzz/stream/.../sub
Origin: https://megaplay.buzz
User-Agent: Mozilla/5.0 ...
```

A current response resembles this shape:

```json
{
  "sources": {
    "file": "https://MEDIA_HOST/.../master.m3u8"
  },
  "tracks": [
    {
      "file": "https://SUBTITLE_HOST/.../eng.vtt",
      "label": "English",
      "kind": "captions",
      "default": true
    }
  ],
  "intro": { "start": 81, "end": 170 },
  "outro": { "start": 1315, "end": 1404 }
}
```

Never commit or share a real returned media URL. It may be temporary, IP-sensitive, or contain provider-specific identifiers.

## 7. Parsing sources and subtitles

Provider payloads are often inconsistent, so AniPlay accepts several shapes:

- a source string;
- `{ file: URL }`;
- `{ url: URL }`;
- `{ src: URL }`;
- arrays of sources;
- nested `sources`, `source`, or `links` objects.

Resolution labels are read from `label` or `quality`; otherwise the result is labeled `Auto`.

A source is considered HLS when its URL contains `.m3u8`. Caption entries are collected from `tracks`, `captions`, or `subtitles`, restricted to caption/subtitle-like kinds, deduplicated by URL, and attached to every parsed stream.

The result becomes a native `StreamLink`:

```ts
{
  url: 'https://MEDIA_HOST/.../master.m3u8',
  resolution: 'Auto',
  hls: true,
  provider: 'MegaPlay',
  downloadable: true,
  subtitles: [/* normalized tracks */],
}
```

## 8. Why KotoCDN needs special headers

The source metadata currently often points to a host such as:

```text
megap.kotocdn.site
```

Requesting the same HLS manifest without browser/provider context can return HTTP 403. AniPlay classifies KotoCDN as a MegaPlay-associated media host and sends:

```http
Referer: https://megaplay.buzz/
Origin: https://megaplay.buzz
User-Agent: a normal browser User-Agent
```

The allowlist currently covers the following MegaPlay-associated domain families:

```text
megaplay.buzz
mewstream.buzz
lostproject.club
voltara.click
kotocdn.site
```

Host matching must accept the exact domain or a real subdomain:

```ts
hostname === domain || hostname.endsWith(`.${domain}`)
```

Do not use a loose substring or plain `endsWith(domain)` check without the dot boundary. For example, `evilmegaplay.buzz` must not be trusted as a MegaPlay host.

## 9. Electron request interception and CORS

The renderer uses `hls.js`, but the media request originates from AniPlay's renderer rather than from the MegaPlay iframe. Electron therefore applies the provider headers in `session.defaultSession.webRequest.onBeforeSendHeaders`.

AniPlay also normalizes CORS response headers in `onHeadersReceived`, limited to explicitly allowlisted provider media URL patterns. This allows `hls.js` to read manifests and segments from the renderer.

Important security rule:

> Never apply provider referers, origins, or permissive CORS rewriting to `*://*/*`.

Keep interception restricted to known media domains. A global rule can leak provider context to unrelated requests and weaken the renderer's network boundary.

The same host classifier is used by the downloader so FFmpeg receives the correct headers for native Anikoto HLS streams.

### Disguised HLS segments during downloads

Some KotoCDN media playlists currently point at MPEG-TS segments wrapped with a small, valid PNG prefix and served as `image/png`. Browser playback can tolerate this provider behavior, but FFmpeg probes the segment as a PNG video. The resulting stream has no usable dimensions, so MP4 stream-copy fails while writing its header.

AniPlay handles this only for recognized MegaPlay/KotoCDN HLS downloads. A tokenized relay bound to `127.0.0.1` rewrites playlist-owned URLs, preserves the upstream provider headers, scans only the beginning of disguised segments, removes the PNG prefix when three 188-byte MPEG-TS packet sync bytes confirm the payload, and streams the remaining bytes as `video/mp2t` to FFmpeg.

The relay does not transcode or buffer the complete episode. It accepts no caller-provided destination URL, uses an ephemeral port and random path token, and closes when FFmpeg finishes or fails. Keep those restrictions if adapting this workaround elsewhere; a generic local HTTP proxy would create a much larger security surface.

## 10. Native-resolution fallback behavior

Native extraction is enabled by default in AniPlay 1.16.2. It can be disabled for debugging or emergency compatibility:

```text
ANIPLAY_ANIKOTO_NATIVE=false
```

Accepted opt-out values are `0`, `false`, and `no`, case-insensitively.

Resolution behavior is:

1. create the iframe fallback when an embed candidate exists;
2. if native resolution is disabled, return the iframe;
3. otherwise try the ordered embed candidates;
4. stop after the first candidate that produces supported native streams;
5. if every native attempt fails, return the iframe rather than failing playback;
6. fail only when neither an embed nor a supported native stream exists.

This is intentional graceful degradation. A private extraction endpoint changing should not immediately remove all Anikoto playback.

## 11. Watch Together behavior

An iframe can send progress events to its parent, but MegaPlay does not document a parent-to-iframe API for reliable play, pause, and seek commands. Outbound progress events alone are insufficient for synchronized playback.

AniPlay therefore considers only non-embed links controllable:

```ts
links.some((link) => !link.embed)
```

When a room matches the current provider, show, episode, and translation type, the player automatically switches from the iframe to the first native source. The existing HTML video synchronization can then:

- apply authoritative play and pause state;
- seek guests to the host position;
- correct small drift using temporary playback-rate changes;
- report buffering/readiness;
- recover the current position after reconnecting.

If a participant resolves only the iframe, AniPlay marks them not ready and displays a warning that Anikoto cannot remain synchronized on that network.

The Worker receives only stable identifiers:

```json
{
  "provider": "anikoto",
  "showId": "anikoto:BASE64URL_METADATA",
  "animeName": "Example title",
  "episode": "1",
  "translationType": "sub",
  "aniListMediaId": 183661
}
```

Every participant resolves their own current media URL. This avoids putting temporary URLs, cookies, or provider headers into room storage and allows region-specific delivery hosts.

## Manual diagnostics

These examples inspect response shapes. They intentionally avoid printing or sharing final media URLs.

### Check the Anikoto catalog

```sh
curl -fsS 'https://anikotoapi.site/recent-anime?page=1&per_page=2' | jq '{ok, pagination, rows: (.data | length)}'
```

### Check a series response

```sh
curl -fsS 'https://anikotoapi.site/series/SERIES_ID' \
  | jq '{ok, episodeCount: (.data.episodes | length), first: (.data.episodes[0] | {number, episode_embed_id, embed_url})}'
```

### Find the internal player ID

```sh
curl -fsS \
  -A 'Mozilla/5.0' \
  -H 'Referer: https://megaplay.buzz/' \
  'https://megaplay.buzz/stream/s-2/EPISODE_EMBED_ID/sub' \
  | rg -o "data-id=['\"][0-9]+['\"]" \
  | head -n 1
```

### Inspect source metadata without displaying URLs

```sh
curl -fsS \
  -A 'Mozilla/5.0' \
  -H 'Accept: application/json,text/plain,*/*' \
  -H 'Origin: https://megaplay.buzz' \
  -H 'Referer: https://megaplay.buzz/stream/s-2/EPISODE_EMBED_ID/sub' \
  'https://megaplay.buzz/stream/getSources?id=INTERNAL_DATA_ID' \
  | jq '{sourceShape: (.sources | type), trackCount: ((.tracks // []) | length), hasIntro: has("intro"), hasOutro: has("outro")}'
```

Respect upstream rate limits. Do not put these commands in a tight loop.

## Common failures

| Symptom | Likely cause | Check |
| --- | --- | --- |
| Anikoto returns 429 | Catalog requests are too frequent | Cache search/series responses and back off |
| Anikoto returns 403 | Heavy API use or network/IP restriction | Stop retrying, wait, and test another network |
| Embed URL works but native extraction fails | MegaPlay changed its internal markup or source endpoint | Recheck `data-id` and the `getSources` response shape |
| `data-id` is missing | Player markup changed or an error/challenge page was returned | Log status, content type, final URL, and a short sanitized HTML signature |
| `getSources` returns 403 | Missing/incorrect `Referer`, `Origin`, or browser User-Agent | Compare the request with the header set above |
| HLS manifest returns 403 | Delivery host was not classified or provider headers were lost | Check the final hostname and Electron request interception |
| Manifest loads but segments fail | Segments use another unregistered domain | Inspect the master/media playlist hostnames and extend the narrow allowlist |
| FFmpeg reports `dimensions not set` for a MegaPlay download | A segment was detected as its PNG wrapper instead of the appended MPEG-TS payload | Inspect the first bytes without logging the signed URL; retain the scoped HLS relay and MPEG-TS sync validation |
| Video plays but subtitles do not | Subtitle host lacks headers/CORS handling or track shape changed | Inspect `tracks`, `captions`, and `subtitles` fields |
| Watch Together remains “loading” | Only the iframe resolved for that participant | Confirm that at least one returned link has `embed !== true` |
| Host can play but a guest cannot | Region/CDN/network differences | Each client resolves locally; test the guest network and avoid sharing the host URL |

## Logging safely

Useful diagnostics:

- request stage: catalog, series, embed HTML, source metadata, manifest;
- response status and content type;
- final hostname after redirects;
- whether an internal `data-id` was found;
- number and type of parsed sources;
- number of subtitle tracks;
- whether fallback embed playback remains available.

Do not log:

- complete media URLs;
- query tokens or signed paths;
- cookies;
- authorization headers;
- full HTML/JSON bodies in normal logs;
- room host capability tokens.

For debug builds, sanitize URLs down to scheme and hostname wherever possible.

## Tests in AniPlay

Relevant deterministic tests:

- `electron/providers/anikoto.test.ts`
  - catalog normalization;
  - series/episode parsing;
  - `data-id` extraction;
  - source and subtitle parsing;
  - native-resolution default and opt-out behavior;
  - embed fallback URL construction.
- `electron/media-headers.test.ts`
  - exact/subdomain host classification;
  - lookalike-host rejection;
  - KotoCDN Electron URL patterns.
- `electron/downloads/download-utils.test.ts`
  - KotoCDN/MegaPlay FFmpeg headers.
- `electron/downloads/hls-mime-proxy.test.ts`
  - playlist URL rewriting;
  - disguised MIME correction;
  - PNG-wrapper/MPEG-TS boundary detection;
  - rejection of non-HTTPS upstream resources.
- `src/lib/watch-together-content.test.ts`
  - native versus embed-only controllability;
  - Anikoto synchronization-warning rules;
  - stable room content without media URLs.

Live provider tests should remain opt-in. Public provider responses, CDN domains, and media URLs change too often for deterministic CI.

## Adding another provider

Use this checklist when integrating another embed-based source.

### Catalog layer

- Identify the official or de facto catalog/search endpoint.
- Determine stable show and episode identifiers.
- Keep provider IDs separate from AniList/MAL IDs.
- Normalize episode numbers and translation/audio modes.
- Cache catalog responses according to the provider's documented limits.

### Embed layer

- Preserve a documented iframe/browser fallback when possible.
- Generate candidates from the strongest provider-specific identifier first.
- Validate embed URLs and protocols before returning them.
- Record the precise referer/origin expected by the embed.

### Native source layer

- Determine whether a documented native API exists before inspecting private player calls.
- If private extraction is necessary, isolate it in one provider module.
- Parse response shapes defensively instead of assuming one JSON layout.
- Support HLS and direct MP4 separately.
- Normalize subtitles, quality labels, and required headers.
- Deduplicate results.
- Do not hardcode a current CDN hostname as the provider identity.

### Playback/network layer

- Add only the provider's known delivery domains to request interception.
- Match exact domains and subdomains safely.
- Apply provider headers to manifests, segments, subtitles, and downloads.
- Scope any CORS rewriting to the narrow media-domain allowlist.
- Test redirects because the final CDN may differ from the initial URL.

### Watch Together layer

- Share stable content IDs, never resolved media URLs.
- Resolve sources independently on every participant.
- Mark iframe-only playback as uncontrollable unless the provider documents a secure bidirectional control protocol.
- Keep guests unready until native media metadata is loaded.
- Provide a visible fallback/error state when a participant cannot resolve the controllable source.

### Failure behavior

- Distinguish catalog failure, mapping failure, embed failure, extraction failure, and CDN failure.
- Retain a lower-capability fallback where it is safe.
- Do not retry 403/429 responses aggressively.
- Bound timeouts and candidate attempts.
- Avoid turning one broken source into a failure for unrelated providers.

### Verification

- Unit-test every parser with sanitized fixtures.
- Test hostile/lookalike hostnames for header rules.
- Test missing fields, malformed JSON, empty sources, and partial subtitle data.
- Test iframe-only fallback behavior.
- Test that room payloads contain no stream URL or headers.
- Perform a manual two-client Watch Together test on separate networks when possible.

## Maintenance warning

The catalog endpoints and embed URL formats are documented upstream. The internal source endpoint, HTML `data-id`, JSON shape, and current KotoCDN delivery hostname may change without notice.

Keep the implementation layered so that a change to any one of these can be repaired independently:

```text
Anikoto catalog parser
        !=
MegaPlay embed builder
        !=
MegaPlay native extractor
        !=
KotoCDN/media request policy
        !=
Watch Together synchronization
```

That separation is the most reusable lesson from this provider integration.


# ./rust-scraper/website/docs/development/security.md

# Security and Privacy

## Release trust

Official Windows binaries are currently unsigned. Microsoft SmartScreen and heuristic antivirus products may warn about uncommon unsigned executables. A warning should be investigated, not automatically ignored.

Older VirusTotal behavior reports have described parts of ani-cli-rs as obfuscated. Expected implementation behaviors that can contribute to heuristic classifications include:

- decoding provider-prefixed Base64URL metadata and parsing provider HTML/JSON;
- resolving temporary media URLs;
- binding a temporary loopback-only HLS compatibility relay;
- launching mpv, VLC, Syncplay, aria2c, yt-dlp, or FFmpeg;
- an installer modifying the current user's `PATH`.

The application does not require administrator privileges.

## Verify a release archive

Every release package must have a matching `.sha256` asset. The install scripts verify it automatically.

PowerShell using built-in .NET hashing:

```powershell
$path = ".\ani-cli-rs-VERSION-x86_64-pc-windows-msvc.zip"
$stream = [System.IO.File]::OpenRead($path)
try {
    $sha = [System.Security.Cryptography.SHA256]::Create()
    try { ([BitConverter]::ToString($sha.ComputeHash($stream))).Replace("-", "") }
    finally { $sha.Dispose() }
} finally { $stream.Dispose() }
```

Linux:

```sh
sha256sum ani-cli-rs-VERSION-x86_64-unknown-linux-musl.tar.gz
cat ani-cli-rs-VERSION-x86_64-unknown-linux-musl.tar.gz.sha256
```

A matching hash proves the file is byte-for-byte identical to the published release asset. It does not independently prove the publisher or source is trustworthy.

## Build from tagged source

Users who prefer not to trust a prebuilt binary can inspect a release tag and run:

```console
cargo build --release --locked
```

Reproducible byte-for-byte output is not promised across compiler versions, linkers, operating systems, or build paths.

## Network behavior

Depending on the command, ani-cli-rs contacts:

- Anikoto API, AniList, Anikoto.cz, and its optional mapper endpoint;
- third-party media/provider hosts returned for the selected episode;
- AnimeSchedule for `--nextep-countdown`;
- GitHub Releases for update checks and installation.

Third-party services see ordinary network metadata such as public IP address, TLS/client characteristics, user agent, and requested resource. Their privacy policies are outside this project's control.

## Logs and issue reports

Routine scraper logs redact complete signed URLs, but users should still inspect logs. Never publish:

- cookies or authorization headers;
- complete temporary media query strings;
- active provider tokens;
- decrypted raw episode payloads;
- personal home/build paths;
- private network or account identifiers.

## Vulnerability reporting

Do not open a public issue for command execution, credential exposure, path escapes, release replacement, or similar security impact. Use GitHub's private advisory form:

<https://github.com/vorlie/ani-cli-rs/security/advisories/new>

Provider outages, expired URLs, ordinary antivirus heuristics, and playback failures belong in public bug reports.

## External plugins

The plugin system is a roadmap, not a shipped feature. The proposed design uses external executables rather than Rust `.dll`/`.so` loading. Such plugins would be trusted native code running as the current user; no plugin should be installed or executed merely because it appears in the current directory.


# ./rust-scraper/website/docs/development/building.md

# Building and Releasing

## Development prerequisites

- current stable Rust with edition 2024 support;
- Git;
- platform linker/toolchain;
- optional external players/downloaders for manual smoke tests.

```console
git clone https://github.com/vorlie/ani-cli-rs.git
cd ani-cli-rs
cargo build
```

## Required checks

```console
cargo fmt --check
cargo check --all-targets
cargo clippy --all-targets -- -D warnings
cargo test
```

Normal tests are deterministic and must not require live providers. Use fixtures and Wiremock for network behavior. Live smoke checks remain opt-in because provider responses and media URLs rotate.

## Release builds and target directories

Cargo automatically separates explicit targets:

```console
cargo release-windows
cargo release-linux
cargo release-linux-arm64
cargo release-macos
cargo release-macos-arm64
```

The Linux ARM64 alias is provided for local/contributor builds only. The maintainer does not publish or device-test Linux ARM64 release assets.

Examples:

```text
target/x86_64-pc-windows-msvc/release/ani-cli-rs.exe
target/x86_64-unknown-linux-musl/release/ani-cli-rs
target/aarch64-unknown-linux-musl/release/ani-cli-rs
```

Install the target first:

```console
rustup target add x86_64-unknown-linux-musl
```

The corresponding linker must also be available.

## Windows privacy remapping

The Windows release workflow remaps the builder's user-profile source path to `/build`. This reduces accidental username/path disclosure in panic and source-location strings. It is not code obfuscation and does not encrypt the binary.

## Package release assets

Windows:

```powershell
.\scripts\package-release.ps1
```

Linux:

```sh
./scripts/package-release.sh
./scripts/package-release.sh x86_64-unknown-linux-musl
```

Packages are written below `dist/` and contain the executable, README, and GPL license. Packaging also generates the `.sha256` sidecar expected by installers.

Windows releases may additionally include:

```text
ani-cli-rs-VERSION-windows-x64-setup.exe
ani-cli-rs-VERSION-windows-x64-setup.exe.sha256
```

## Release checklist

1. Confirm the version in `Cargo.toml` and the root package entry in `Cargo.lock`.
2. Run every required check from a clean tree.
3. Build/package Windows x64 and Linux x86-64 musl. Do not list Linux ARM64 as an official asset without a separately tested release policy.
4. Test `--version`, `--help`, search, one playback resolution, one direct download, and one HLS path.
5. Verify each archive locally.
6. Create the matching Git tag/release.
7. Upload every archive/installer together with its `.sha256` file.
8. Test both install scripts against the published release.
9. Confirm the built-in updater resolves assets from the exact selected tag.

Do not publish a release containing only the binary: the install scripts require the correctly named archive and checksum.

## macOS policy

Cargo aliases support local Intel and Apple Silicon builds, but official macOS assets are not published because hosted macOS CI minutes are limited and more expensive. Contributors may document successful local builds without implying official release support.

## SemVer and commits

- Patch: compatible bug and provider fixes.
- Minor: additive user-facing workflows, such as interactive download preflight.
- Major: incompatible CLI or public library API changes.

Prefer scoped conventional commit messages and isolate a release version bump when practical.


# ./rust-scraper/website/docs/development/contributing.md

# Contributing

Bug fixes, provider compatibility updates, tests, documentation, and focused feature proposals are welcome.

## Before coding

1. Search existing issues and pull requests.
2. Reproduce on the latest release or `master` where safe.
3. Keep one change focused on one problem.
4. Open an issue before a large CLI redesign, public API break, new provider, or plugin architecture change.

## Setup

```console
git clone https://github.com/vorlie/ani-cli-rs.git
cd ani-cli-rs
cargo build
```

Create a descriptive branch:

```console
git switch -c fix/provider-response-shape
git switch -c feat/interactive-download-selection
```

## Required validation

```console
cargo fmt --check
cargo check --all-targets
cargo clippy --all-targets -- -D warnings
cargo test
```

Do not make normal tests depend on live providers. Use fixtures or Wiremock.

## Good commit boundaries

Prefer commits that are independently understandable and testable:

```text
refactor(cli): separate resolution from media actions
feat(download): preflight episodes before transfers
docs(download): explain interactive selection
chore(release): bump version to 0.6.0
```

Avoid mixing formatting, unrelated cleanup, generated artifacts, and the actual fix.

## Scraper changes

Read [Provider Architecture](architecture.md) and the relevant source-adjacent provider document first.

- Include sanitized response fixtures.
- Preserve partial-provider success.
- Carry provider headers in `StreamLink`.
- Explain whether behavior matches Bash ani-cli, AniPlay, or a newly observed upstream change.
- Never log complete signed URLs or active authentication values.

## CLI/platform changes

- Preserve `ani-cli [options] [query] [options]` compatibility where practical.
- Keep the scriptable subcommands non-interactive.
- Pass process arguments separately.
- Add parser/integration tests for flags and environment variables.
- Document intentional differences among Windows, Linux, and macOS.

## Pull requests

Describe:

- the user-visible problem;
- the chosen behavior;
- tests run;
- manual platform/provider checks;
- known limitations;
- linked issues.

All contributions are accepted under GPL-3.0-only.

## Plugin work

The repository's plugin roadmap proposes versioned external executable plugins rather than Rust dynamic libraries. Do not begin provider-plugin integration before the protocol, history/provider identity, process limits, and trust model are settled.


# ./rust-scraper/website/docs/development/anikoto-cz.md

# Anikoto.cz provider workflow

This document describes the native Rust implementation behind
`--provider anikoto2`. It is a contributor reference for ani-cli-rs and other
projects integrating the same catalog. The website endpoints are private
implementation details and may change without notice.

The implementation lives in:

- `src/anikoto_cz.rs` for catalog and source resolution;
- `src/hls_relay.rs` for KotoCDN playlist and segment compatibility;
- `src/player.rs` and `src/download.rs` for relay lifetime management.

No Python helper, nginx service, or externally reachable proxy is used.

## Complete flow

```text
search query
    -> GET /ajax/anime/search?keyword=...
    -> parse /watch/<slug> results
    -> GET /watch/<slug>
    -> read #watch-main data-id and canonical data-url
    -> GET /ajax/episode/list/<id>?style=grid&vrf=
    -> select SUB/H-SUB or DUB episode
    -> GET canonical episode page
    -> GET /ajax/server/list?servers=<episode token>
    -> GET /ajax/server?get=<server token>
    -> MegaPlay or VidTube embed
    -> read numeric data-id
    -> GET <embed origin>/stream/getSources?id=<data-id>&type=<sub|dub>
    -> validate native media and subtitle URLs
    -> expand HLS master qualities
    -> play/download through the scoped KotoCDN relay
```

Search IDs are Base64URL JSON prefixed with `anikoto2:`:

```json
{
  "slug": "black-torch-1d364",
  "title": "Black Torch",
  "episodes": null
}
```

The prefix makes history and scriptable commands self-routing. A raw slug is
accepted only when the caller explicitly selects `--provider anikoto2`.

## Requests and cookies

`AnikotoCzClient` uses a dedicated `reqwest::Client` with:

- a coherent Chromium user agent;
- an in-memory cookie jar;
- bounded redirects and a 15-second timeout;
- `Referer`, `Accept-Language`, `Accept`, and `X-Requested-With` headers;
- a response-size cap before parsing provider HTML or JSON.

HTTP 429 is returned as a provider rate-limit error. Failed requests are not
aggressively retried.

## Episode and language handling

Episode anchors expose:

- `data-num`: display number, including fractional episodes;
- `data-slug`: canonical episode-page suffix;
- `data-ids`: token used by the server-list endpoint;
- `data-mal` and `data-timestamp`: optional mapper inputs;
- `data-sub` and `data-dub`: strict language availability.

SUB mode includes both soft-sub and hard-sub groups. DUB mode includes only
dub groups. The client never silently changes language.

The optional `mapper.nekostream.site` response can add Vidstream,
Kiwi-Stream, or Vibe-Stream candidates when MAL and timestamp metadata exist.
Mapper failure does not discard the website's own server list.

## Native source extraction

The `/ajax/server` exchange returns an embed URL. Native extraction is
currently restricted to exact `megaplay.buzz`/`vidtube.site` hosts and their
real subdomains. Other embeds are reported as unsupported rather than passed
to an external player as if they were direct media.

Supported embeds expose:

```html
<div data-id="123456"></div>
```

The numeric ID is sent to the embed origin's `/stream/getSources` endpoint
with the embed URL as referer and its origin as `Origin`.
The selected language is sent as `type=sub` or `type=dub`; VidTube can reuse
the same numeric ID for both languages and defaults to sub when `type` is absent.
Nested `sources`/`source`/`links` objects and `file`/`url`/`src` values are normalized
defensively. Subtitle tracks are read from `tracks`, `captions`, and
`subtitles`.

Only validated HTTPS URLs without credentials or literal-IP hosts become
`StreamLink` values. Provider headers remain attached to each stream and are
passed as separate player/downloader arguments.

## KotoCDN compatibility relay

Some KotoCDN HLS fragments are valid MPEG-TS data preceded by a small PNG
payload. Passing those URLs directly to FFmpeg/mpv can make the segment appear
to be an image and terminate playback.

ani-cli-rs starts a temporary Hyper server on `127.0.0.1` and registers only
resources discovered from the selected playlist. It:

- uses an ephemeral port and unguessable resource tokens;
- rewrites master/media playlists and `URI=` attributes;
- forwards the stream's required provider headers;
- rejects credentials and non-HTTPS upstream resources;
- caps playlist size and registered resource count;
- strips a PNG prefix only after finding three MPEG-TS sync bytes exactly
  188 bytes apart;
- corrects segment MIME types for GET and HEAD requests;
- shuts down when the attached player or downloader exits.

This is a short-lived loopback compatibility proxy, not a public relay. It
does not listen on LAN interfaces.

## Safe diagnostics

Useful issue information:

- provider stage that failed;
- HTTP status and final hostname;
- selected language and server label;
- number of native sources and subtitle tracks;
- whether a master playlist contained variants;
- whether the loopback relay started.

Never publish complete embed/media URLs, signed paths, query tokens, cookies,
or raw provider response bodies.

## Manual verification

```console
ani-cli-rs -p anikoto2 search --json "black torch"
ani-cli-rs episodes ANIKOTO2_ID --mode sub
ani-cli-rs links ANIKOTO2_ID 1 --json
ani-cli-rs play ANIKOTO2_ID 1 --title "Black Torch" --no-detach
```

The `links --json` result contains temporary URLs and must be sanitized before
sharing.

The opt-in Rust smoke test performs search, episode discovery, and native
source resolution without printing URLs:

```sh
ANI_CLI_LIVE_ANIKOTO2=1 cargo test live_anikoto_cz_smoke_test_is_opt_in --lib
```

Normal `cargo test` remains deterministic.


# ./rust-scraper/website/docs/development/architecture.md

# Provider Architecture

ani-cli-rs ships two independent catalog clients:

| CLI value | Catalog | Native source path | ID prefix |
|---|---|---|---|
| `anikoto` (default) | `anikotoapi.site` plus optional AniList enrichment | MegaPlay | `anikoto:` |
| `anikoto2` | `anikoto.cz` website AJAX workflow | MegaPlay/VidTube | `anikoto2:` |

AllAnime/Mkissa and its rotating cryptographic bootstrap are no longer part of
the application.

## Module boundaries

| Module | Responsibility |
|---|---|
| `anikoto` | Anikoto API/AniList catalog merge and MegaPlay extraction |
| `anikoto_cz` | Anikoto.cz HTML/AJAX catalog, server tokens, MegaPlay/VidTube extraction |
| `hls_relay` | Tokenized loopback playlist rewriting and PNG-wrapped TS removal |
| `models` | Provider IDs, search results, stream metadata, quality/episode ordering |
| `player` | Safe external-player arguments and relay lifetime |
| `download` | Downloader fallback order, progress, subtitles, relay lifetime |
| `history` | Legacy tab-separated history with self-routing provider IDs |

## Routing

Searches use the explicitly selected provider or the `anikoto` default.
Subsequent commands inspect provider-prefixed IDs:

```text
anikoto:<base64url metadata>  -> Anikoto API client
anikoto2:<base64url metadata> -> Anikoto.cz client
```

This also makes mixed-provider history continuation deterministic. Raw numeric
IDs and raw slugs are intentionally interpreted only by the provider selected
with `--provider`.

Providers never silently fall back to each other. A failure remains attributed
to the catalog the user selected.

## Shared stream contract

Both clients return `StreamLink` values containing:

- validated native media URL;
- quality label and HLS/direct-media classification;
- provider/server label;
- downloadability;
- narrowly scoped referer, origin, and user-agent headers;
- optional validated subtitle tracks.

Quality ordering, player launch, downloads, and history updates operate on this
shared type and do not need provider-specific branches.

## KotoCDN relay

MegaPlay-associated HLS can contain MPEG-TS fragments hidden behind a PNG
prefix. `hls_relay` binds only to `127.0.0.1` on an ephemeral port, rewrites
registered playlist resources, validates every upstream URL, and removes a
prefix only when three MPEG-TS sync bytes appear 188 bytes apart.

The player/downloader remains attached for the relay lifetime. Dropping
`HlsRelay` signals its accept loop to stop.

This is not an internet-facing proxy and cannot fetch arbitrary caller URLs.

## Provider references

- [Anikoto API, MegaPlay, and KotoCDN](https://github.com/vorlie/ani-cli-rs/blob/master/docs/ANIKOTO-KOTOCDN.md)
- [Anikoto.cz workflow](https://github.com/vorlie/ani-cli-rs/blob/master/docs/ANIKOTO-CZ.md)

## Testing

Normal tests use parser fixtures and Wiremock. Live smoke tests are opt-in:

```sh
ANI_CLI_LIVE_ANIKOTO=1 cargo test live_anikoto_smoke_test_is_opt_in --lib
ANI_CLI_LIVE_ANIKOTO2=1 cargo test live_anikoto_cz_smoke_test_is_opt_in --lib
```

Never print complete resolved media URLs in test output or issue reports.


# ./rust-scraper/website/docs/development/using-as-a-library.md

# Using ani-cli-rs as a Rust Library

`ani-cli-rs` is primarily distributed as a command-line application, but its
core functionality is also exposed as a reusable Rust library crate.

The library is published under the crate name `ani-cli-rs` and is exposed to
Rust code through the `ani_lib` library target.

This allows other Rust applications to use the provider clients, stream
resolution, HLS relay, downloading, history, and player-related functionality
without depending on the CLI application itself.

> **Note:** The library API is still under active development. Public APIs may
> change between releases while the library is being stabilized.

## Crate setup

The package is named `ani-cli-rs`, while its library target is named
`ani_lib`:

```toml
[package]
name = "ani-cli-rs"
version = "0.9.4"

[lib]
name = "ani_lib"
path = "src/lib.rs"
```

Add it to your application's `Cargo.toml`:

```toml
[dependencies]
ani-cli-rs = "0.9.6"
```

Then import functionality from `ani_lib`:

```rust
use ani_lib::{
    AnikotoCzClient,
    SearchResult,
    StreamLink,
    TranslationType,
};
```

## Repository dependency

If you are developing against a version of `ani-cli-rs` that has not yet been
published to crates.io, Cargo can use a Git repository instead:

```toml
[dependencies]
ani-cli-rs = {
    git = "https://github.com/vorlie/ani-cli-rs.git"
}
```

For applications that need a specific revision, pin the dependency to a
commit:

```toml
[dependencies]
ani-cli-rs = {
    git = "https://github.com/vorlie/ani-cli-rs.git",
    rev = "a430c6e6a203dcf9fac8817e132bffcbd4bac11f"
}
```

Pinning a commit is useful when your application depends on an API that is
still changing. It also ensures that another developer or CI system builds
against exactly the same revision.

## What is exposed by the library?

The crate currently exposes the following main components:

| API                        | Purpose                              |
| -------------------------- | ------------------------------------ |
| `AnikotoClient`            | Anikoto API catalog client           |
| `AnikotoCzClient`          | Anikoto.cz catalog client            |
| `SearchResult`             | Search result metadata               |
| `StreamLink`               | Resolved media stream metadata       |
| `SubtitleTrack`            | Subtitle track metadata              |
| `TranslationType`          | Sub/dub selection                    |
| `HlsRelay`                 | Local HLS relay lifetime             |
| `relay_stream`             | Create a local HLS relay             |
| `download_stream`          | Download a resolved stream           |
| `DownloadOptions`          | Download configuration               |
| `HistoryStore`             | Persistent playback history          |
| `Player`                   | External player integration          |
| `PlayerKind`               | Supported player selection           |
| `PlayerOptions`            | Player configuration                 |
| `choose_quality`           | Select an appropriate stream quality |
| `expand_episode_selection` | Expand episode selections            |
| `I18n` / `Locale`          | Localization support                 |
| `AniError` / `Result`      | Library error handling               |

The exact public API should be treated as version-dependent while the library
is still being stabilized.

---

# Basic provider usage

A simple application can create an `AnikotoCzClient`, search for an anime, and
then retrieve its episodes and streams.

```rust
use ani_lib::{
    AnikotoCzClient,
    TranslationType,
};

#[tokio::main]
async fn main() -> ani_lib::Result<()> {
    let client = AnikotoCzClient::new()?;

    let results = client
        .search("Mushoku Tensei", TranslationType::Sub)
        .await?;

    for result in results {
        println!("{} ({})", result.name, result.id);
    }

    Ok(())
}
```

The client is asynchronous, so applications should run it inside a Tokio
runtime.

## Searching

Search results are returned as `SearchResult` values.

A typical workflow is:

```text
search
  ↓
SearchResult
  ↓
episodes
  ↓
StreamLink
  ↓
playback / download
```

For example:

```rust
let results = client
    .search("Mushoku Tensei", TranslationType::Sub)
    .await?;

let show = results
    .first()
    .ok_or_else(|| ani_lib::AniError::NotFound(
        "No results found".into()
    ))?;
```

Applications should generally keep the complete `SearchResult` rather than
only storing its display name, since the provider-specific ID is required for
subsequent requests.

---

# Getting episodes

Once a `SearchResult` has been selected, retrieve its available episodes:

```rust
let episodes = client
    .episodes(&show.id, TranslationType::Sub)
    .await?;

for episode in &episodes {
    println!("Episode {episode}");
}
```

The library represents episode identifiers as strings:

```rust
Vec<String>
```

This is intentional because provider episode identifiers are not guaranteed
to always be simple integers.

For example, an application should not assume that every episode can safely be
parsed with:

```rust
episode.parse::<u32>()
```

---

# Resolving streams

After selecting an episode, request its available streams:

```rust
let streams = client
    .streams(
        &show.id,
        "1",
        TranslationType::Sub,
    )
    .await?;

for stream in &streams {
    println!(
        "{} - {} ({})",
        stream.resolution,
        stream.provider,
        if stream.hls { "HLS" } else { "Direct" }
    );
}
```

The resulting `StreamLink` contains the information needed by a player or
downloader.

Conceptually:

```text
StreamLink
├── URL
├── resolution
├── provider
├── HLS/direct classification
├── downloadability
├── request headers
└── optional subtitle tracks
```

Applications should use the `StreamLink` returned by the library rather than
attempting to reconstruct provider URLs themselves.

---

# Subtitles

Streams can contain optional subtitle tracks.

The public model is:

```rust
pub struct SubtitleTrack {
    pub label: String,
    pub url: String,
    pub default: bool,
}
```

For example:

```rust
for subtitle in &stream.subtitles {
    println!(
        "{}: {}{}",
        subtitle.label,
        subtitle.url,
        if subtitle.default {
            " (default)"
        } else {
            ""
        }
    );
}
```

The subtitle URL should be treated as provider-controlled data. Applications
should not assume that it uses the same host as the media stream.

If a player requires subtitles to be loaded through a local relay, the
application is responsible for providing that relay path.

---

# HLS playback

HLS streams require additional handling when consumed by applications that
cannot directly access the provider's media resources.

`ani-cli-rs` exposes:

```rust
pub use hls_relay::{
    HlsRelay,
    relay_stream,
    relay_stream_without_hls_subtitles,
};
```

A relay can be created from a `StreamLink`:

```rust
use ani_lib::relay_stream;

let (relay, local_stream) = relay_stream(&stream).await?;

println!("Local playback URL: {}", local_stream.url);
```

The important detail is that the returned `HlsRelay` must remain alive while
the stream is being played:

```rust
let (relay, local_stream) = relay_stream(&stream).await?;

// Keep `relay` alive while the player is using `local_stream`.
play(local_stream.url).await?;

// Relay is dropped after playback finishes.
drop(relay);
```

Dropping the relay shuts down its local server.

## Why is a relay needed?

Some provider HLS resources require request-specific handling and cannot be
consumed directly by every embedded player or WebView.

The relay provides a loopback URL such as:

```text
http://127.0.0.1:<port>/...
```

while keeping the upstream provider request handling inside the library.

The relay binds to loopback rather than exposing itself as an internet-facing
proxy.

---

# Example: application playback pipeline

A desktop application can combine the APIs into a complete playback flow:

```rust
use ani_lib::{
    relay_stream,
    AnikotoCzClient,
    TranslationType,
};

#[tokio::main]
async fn main() -> ani_lib::Result<()> {
    let client = AnikotoCzClient::new()?;

    let results = client
        .search("Mushoku Tensei", TranslationType::Sub)
        .await?;

    let show = results
        .first()
        .ok_or_else(|| ani_lib::AniError::NotFound(
            "No anime found".into()
        ))?;

    let episodes = client
        .episodes(&show.id, TranslationType::Sub)
        .await?;

    let episode = episodes
        .first()
        .ok_or_else(|| ani_lib::AniError::NotFound(
            "No episodes found".into()
        ))?;

    let streams = client
        .streams(
            &show.id,
            episode,
            TranslationType::Sub,
        )
        .await?;

    let stream = streams
        .first()
        .ok_or_else(|| ani_lib::AniError::NotFound(
            "No streams found".into()
        ))?;

    if stream.hls {
        let (_relay, local_stream) = relay_stream(stream).await?;

        println!("Play: {}", local_stream.url);

        // Keep `_relay` alive until playback finishes.
    } else {
        println!("Play: {}", stream.url);
    }

    Ok(())
}
```

A real application would normally add quality selection, error handling,
subtitle handling, and player integration around this flow.

---

# Using ani-cli-rs from Tauri

One practical use case for the library is embedding it into a Rust desktop
application.

For example, **Kioku** uses `ani_lib` from its Tauri backend to provide its
playback functionality.

Its dependency can be pinned directly to a Git revision during development:

```toml
[dependencies]
ani_lib = {
    package = "ani-cli-rs",
    git = "https://github.com/vorlie/ani-cli-rs.git",
    rev = "a430c6e6a203dcf9fac8817e132bffcbd4bac11f"
}
```

The important distinction here is:

```toml
package = "ani-cli-rs"
```

refers to the Cargo package name, while:

```rust
use ani_lib::...;
```

refers to the library target exposed by that package.

## Tauri command example

A Tauri backend can expose the provider API to a frontend:

```rust
#[tauri::command]
pub async fn playback_search(
    query: String,
    translation: TranslationType,
) -> Result<Vec<SearchResult>, String> {
    let client = AnikotoCzClient::new()
        .map_err(|error| error.to_string())?;

    client
        .search(&query, translation)
        .await
        .map_err(|error| error.to_string())
}
```

The frontend can then invoke the command without needing to know anything
about the provider implementation.

This gives the application a clean separation:

```text
┌─────────────────────────────┐
│          Kioku UI           │
│       React / TypeScript    │
└──────────────┬──────────────┘
               │ Tauri commands
               ▼
┌─────────────────────────────┐
│       Kioku Rust backend    │
│        playback.rs          │
└──────────────┬──────────────┘
               │ ani_lib
               ▼
┌─────────────────────────────┐
│          ani_lib             │
│                             │
│  Anikoto clients             │
│  Stream resolution           │
│  HLS relay                   │
│  Downloads                   │
│  Player integration          │
└─────────────────────────────┘
```

This is preferable to duplicating provider extraction logic inside the
application.

---

# Keeping the dependency reproducible

When using the Git dependency during development, there are two common
approaches.

## Track a branch

```toml
[dependencies]
ani_lib = {
    package = "ani-cli-rs",
    git = "https://github.com/vorlie/ani-cli-rs.git",
    branch = "master"
}
```

This is convenient when actively developing both projects.

However, the dependency can change whenever the branch moves.

## Pin a commit

```toml
[dependencies]
ani_lib = {
    package = "ani-cli-rs",
    git = "https://github.com/vorlie/ani-cli-rs.git",
    rev = "a430c6e6a203dcf9fac8817e132bffcbd4bac11f"
}
```

This is preferable for reproducible builds when depending on an unreleased
library API.

Once a compatible library version is published, applications should generally
prefer the versioned crate dependency:

```toml
[dependencies]
ani-cli-rs = "0.9"
```

---

# API stability

The library target is currently considered a developing API.

This means applications using `ani_lib` should expect that:

* public types may gain or lose fields;
* functions may change signatures;
* provider-specific behavior may change;
* error variants may change;
* playback and relay APIs may evolve;
* provider implementations can change independently of the public API.

For applications that need a stable build, pin a known-good release or Git
commit rather than tracking the development branch indefinitely.

The CLI and library share the same underlying provider implementation, so
provider changes can affect both.

---

# Recommended integration pattern

For a desktop media application, the recommended architecture is:

```text
Application
│
├── Search
│   └── AnikotoCzClient::search()
│
├── Series selection
│   └── AnikotoCzClient::episodes()
│
├── Episode selection
│   └── AnikotoCzClient::streams()
│
├── Quality/source selection
│   └── StreamLink
│
├── Playback
│   ├── direct stream
│   └── relay_stream() for HLS
│
├── Subtitles
│   └── StreamLink.subtitles
│
└── Download
    └── download_stream()
```

Keep provider-specific logic inside `ani_lib` whenever possible.

The application should primarily deal with the shared models:

```rust
SearchResult
StreamLink
SubtitleTrack
TranslationType
```

This makes it possible to change the provider implementation without
requiring the UI or playback layer to understand how media URLs are extracted.

---

# Kioku

[Kioku](https://github.com/vorlie/kioku) is one example of an application
currently integrating `ani_lib`.

Kioku uses the library from its Tauri backend rather than implementing the
Anikoto provider logic itself. Its playback system uses the shared
`SearchResult` and `StreamLink` models and the library's HLS relay for streams
that require local handling.

Kioku is currently **not a finished application** and should be considered a
development/integration example rather than a reference implementation of a
stable `ani_lib` API.

Its integration is nevertheless useful for demonstrating how the library can
be embedded into a larger Rust application with a non-CLI frontend.

---

# Related documentation

* [Provider Architecture](architecture.md)
* [Anikoto API, MegaPlay, and KotoCDN](../development/anikoto-kotocdn.md)
* [Anikoto.cz workflow](../development/anikoto-cz.md)
* [Building and Releasing](building.md)
* [Playback and Players](../guides/playback-and-players.md)

# ./rust-scraper/website/docs/errors/index.md

# ani-cli-rs Error Codes

ani-cli-rs uses stable error codes to make failures easier to understand and report. Each error code is a stable identifier that will not change across versions.

## Error Code Scheme

Error codes follow the format `ACL-xxxx` where:
- `ACL` = `ani-cli`
- `xxxx` = numeric identifier

### Code Ranges

- **ACL-1xxx**: Network / provider errors
- **ACL-2xxx**: Search / anime / episode errors  
- **ACL-3xxx**: Streaming / source errors
- **ACL-4xxx**: Download errors
- **ACL-5xxx**: Playback errors
- **ACL-6xxx**: Filesystem / configuration errors
- **ACL-7xxx**: Authentication / external services
- **ACL-9xxx**: Internal / unexpected errors

---

## Network / Provider Errors (ACL-1xxx)

<a id="ACL-1001"></a>
### ACL-1001 — Provider unavailable

The selected provider could not be reached.

**Possible causes**
- Network connection problems
- Provider downtime
- DNS issues
- Provider blocking the request

**Try**
- Check your internet connection
- Try again later
- Try another provider

**Current mapping**: `AniError::ProviderUnavailable { provider, source }`

---

<a id="ACL-1002"></a>
### ACL-1002 — Provider request failed

A request to the provider failed during execution.

**Possible causes**
- Network timeout
- Connection interruption
- TLS/SSL certificate issues

**Try**
- Check your internet connection
- Try again later
- Check if the provider is experiencing issues

**Current mapping**: `AniError::ProviderRequestFailed { provider, source }`

---

<a id="ACL-1003"></a>
### ACL-1003 — Provider returned invalid response

The provider returned data that ani-cli-rs could not understand.

**Possible causes**
- Provider API changed
- Provider returned malformed data
- Provider returned unexpected data structure

**Try**
- Try another provider
- If the problem persists, report it with the error details

**Current mapping**: `AniError::ProviderInvalidResponse { provider, message, source }`

---

<a id="ACL-1004"></a>
### ACL-1004 — Provider rate limited

The provider has rate-limited requests from ani-cli-rs.

**Possible causes**
- Too many requests in a short time
- Provider throttling

**Try**
- Wait a few minutes and try again
- Try another provider

**Current mapping**: `AniError::ProviderRateLimited { provider, retry_after_seconds }`

---

<a id="ACL-1005"></a>
### ACL-1005 — Provider catalog error

The provider's catalog or search API returned an error.

**Possible causes**
- Provider catalog service down
- Invalid search parameters
- Provider internal error

**Try**
- Try another provider
- Check your search query
- Try again later

**Current mapping**: `AniError::ProviderCatalogError { provider, message, source }`

---

<a id="ACL-1006"></a>
### ACL-1006 — Provider URL validation failed

A provider URL failed security validation.

**Possible causes**
- URL uses HTTP instead of HTTPS
- URL contains credentials
- URL points to a literal IP address
- URL has invalid format

**Try**
- This is typically an internal error
- Report it if it persists

**Current mapping**: `AniError::ProviderUrlValidationFailed { reason }`

---

<a id="ACL-1007"></a>
### ACL-1007 — Provider response size exceeded

The provider returned a response that exceeded safety limits.

**Possible causes**
- Provider returned unusually large response
- Possible attack or malformed response

**Try**
- Try another provider
- Report this if it persists

**Current mapping**: `AniError::ProviderResponseSizeExceeded { provider, size, limit }`

---

## Search / Anime / Episode Errors (ACL-2xxx)

<a id="ACL-2001"></a>
### ACL-2001 — No search results found

No anime matching the search query was found.

**Possible causes**
- Search query doesn't match any anime
- Typo in the search query
- Anime not available on selected provider

**Try**
- Check your search query spelling
- Try a different search term
- Try another provider

**Current mapping**: `AniError::NoSearchResults`

---

<a id="ACL-2002"></a>
### ACL-2002 — Empty search query

Search query was empty.

**Possible causes**
- No search query provided
- Interactive input not available

**Try**
- Provide a search query
- Use interactive mode if available

**Current mapping**: `AniError::EmptySearchQuery`

---

<a id="ACL-2003"></a>
### ACL-2003 — No episodes available

No episodes are available for the selected anime.

**Possible causes**
- Anime has no episodes yet
- Episodes not available on selected provider
- Anime not fully released

**Try**
- Try another provider
- Check if the anime is released
- Try a different anime

**Current mapping**: `AniError::NoEpisodesAvailable { anime }`

---

<a id="ACL-2004"></a>
### ACL-2004 — Invalid episode selection

Selected episode is not available or invalid.

**Possible causes**
- Episode number out of range
- Episode not available for selected mode (sub/dub)
- Invalid episode format

**Try**
- Check available episodes
- Try a different episode
- Try subtitle/dub mode toggle

**Current mapping**: `AniError::InvalidEpisodeSelection { episode, reason }`

---

<a id="ACL-2005"></a>
### ACL-2005 — Selection out of range

User selection is outside the valid range.

**Possible causes**
- Selected option doesn't exist
- List changed during selection

**Try**
- Try again with valid selection
- Refresh the list

**Current mapping**: `AniError::SelectionOutOfRange { max, selected }`

---

<a id="ACL-2006"></a>
### ACL-2006 — Command requires query

Command requires a query parameter but none was provided.

**Possible causes**
- Missing required argument
- Non-interactive terminal without query

**Try**
- Provide the required query
- Use interactive mode if available

**Current mapping**: `AniError::CommandRequiresQuery`

---

## Streaming / Source Errors (ACL-3xxx)

<a id="ACL-3001"></a>
### ACL-3001 — No playable sources found

No playable video sources were found for the selected episode.

**Possible causes**
- No video servers available
- All sources failed to resolve
- Provider has no working streams

**Try**
- Try another provider
- Try subtitle/dub mode toggle
- Try a different episode

**Current mapping**: `AniError::NoPlayableSources { anime, episode, mode }`

---

<a id="ACL-3002"></a>
### ACL-3002 — Source resolution failed

Failed to resolve video sources from provider.

**Possible causes**
- Provider source API changed
- Source extraction failed
- Invalid source data

**Try**
- Try another provider
- Try a different episode
- Report if it persists

**Current mapping**: `AniError::SourceResolutionFailed { provider, reason }`

---

<a id="ACL-3003"></a>
### ACL-3003 — Stream unavailable

The selected video stream is not available.

**Possible causes**
- Stream server down
- Stream removed
- Network issues

**Try**
- Try another quality/source
- Try another provider
- Check your connection

**Current mapping**: `AniError::StreamUnavailable { reason }`

---

<a id="ACL-3004"></a>
### ACL-3004 — Unsupported embed host

Provider uses an unsupported embed host.

**Possible causes**
- Provider added new embed host
- Embed host not whitelisted

**Try**
- Try another provider
- Report this for host whitelist update

**Current mapping**: `AniError::UnsupportedEmbedHost { host }`

---

<a id="ACL-3005"></a>
### ACL-3005 — No native streams available

Provider returned no supported native video streams.

**Possible causes**
- Provider changed stream format
- No compatible streams available

**Try**
- Try another provider
- Try a different episode

**Current mapping**: `AniError::NoNativeStreams { provider }`

---

## Download Errors (ACL-4xxx)

<a id="ACL-4001"></a>
### ACL-4001 — Download failed

General download failure.

**Possible causes**
- Network issues during download
- Server not responding
- Connection interrupted

**Try**
- Check your internet connection
- Try again later
- Try another source/provider

**Current mapping**: `AniError::DownloadFailed { reason, source }`

---

<a id="ACL-4002"></a>
### ACL-4002 — No download tool available

No suitable download tool (yt-dlp or FFmpeg) found for HLS downloads.

**Possible causes**
- yt-dlp not installed
- FFmpeg not installed
- Tools not in PATH

**Try**
- Install yt-dlp or FFmpeg
- Ensure tools are in your PATH
- Use non-HLS sources if available

**Current mapping**: `AniError::NoDownloadTool`

---

<a id="ACL-4003"></a>
### ACL-4003 — HLS download failed

HLS stream download failed.

**Possible causes**
- yt-dlp/FFmpeg failed
- HLS stream corrupted
- Network issues

**Try**
- Check yt-dlp/FFmpeg installation
- Try another source
- Check your connection

**Current mapping**: `AniError::HlsDownloadFailed { reason }`

---

<a id="ACL-4004"></a>
### ACL-4004 — Subtitle download failed

Failed to download subtitle track.

**Possible causes**
- Subtitle server not responding
- Invalid subtitle URL
- Network issues

**Try**
- Try without subtitles
- Try another source
- Check your connection

**Current mapping**: `AniError::SubtitleDownloadFailed { track, reason }`

---

<a id="ACL-4005"></a>
### ACL-4005 — Subtitle size exceeded

Subtitle track exceeds safety size limit (16 MiB).

**Possible causes**
- Malformed subtitle file
- Subtitle file too large

**Try**
- Try another source
- Try without subtitles
- Report if it persists

**Current mapping**: `AniError::SubtitleSizeExceeded { size, limit }`

---

<a id="ACL-4006"></a>
### ACL-4006 — Download output error

Failed to write downloaded content to disk.

**Possible causes**
- Disk full
- Permission issues
- Invalid path

**Try**
- Check disk space
- Check write permissions
- Use a different download directory

**Current mapping**: `AniError::DownloadOutputError { path, reason }`

---

## Playback Errors (ACL-5xxx)

<a id="ACL-5001"></a>
### ACL-5001 — Player not found

Configured player executable not found.

**Possible causes**
- Player not installed
- Player not in PATH
- Incorrect player path in configuration

**Try**
- Install the player
- Check player installation
- Update player path in configuration

**Current mapping**: `AniError::PlayerNotFound { executable }`

---

<a id="ACL-5002"></a>
### ACL-5002 — Player launch failed

Failed to launch the media player.

**Possible causes**
- Player execution failed
- Invalid player arguments
- Permission issues

**Try**
- Check player installation
- Try a different player
- Check player configuration

**Current mapping**: `AniError::PlayerLaunchFailed { executable, reason }`

---

<a id="ACL-5003"></a>
### ACL-5003 — Player exited with error

Media player exited with a non-zero status code.

**Possible causes**
- Player encountered an error
- Invalid media file
- Player configuration issue

**Try**
- Try a different player
- Try a different source
- Check player logs

**Current mapping**: `AniError::PlayerExitedWithError { executable, exit_code }`

---

<a id="ACL-5004"></a>
### ACL-5004 — Android terminal required

Android playback requires an interactive terminal.

**Possible causes**
- Running in non-interactive mode on Android
- Termux session not interactive

**Try**
- Use interactive terminal on Android
- Use download mode instead

**Current mapping**: `AniError::AndroidTerminalRequired`

---

<a id="ACL-5005"></a>
### ACL-5005 — General player error

General media player error.

**Possible causes**
- Player-specific issues
- Media format issues
- Player configuration problems

**Try**
- Try a different player
- Check player documentation
- Try a different source

**Current mapping**: `AniError::GeneralPlayerError { reason }`

---

## Filesystem / Configuration Errors (ACL-6xxx)

<a id="ACL-6001"></a>
### ACL-6001 — I/O error

General filesystem I/O error.

**Possible causes**
- Permission issues
- Disk full
- Invalid path
- Filesystem errors

**Try**
- Check file permissions
- Check disk space
- Verify paths are correct
- Check filesystem health

**Current mapping**: `AniError::IoError { source, context }`

---

<a id="ACL-6002"></a>
### ACL-6002 — History state directory error

Could not determine or create state directory for history.

**Possible causes**
- No valid state directory found
- Permission issues
- Invalid configuration

**Try**
- Check configuration
- Check directory permissions
- Verify app data directory

**Current mapping**: `AniError::HistoryStateDirectoryError`

---

<a id="ACL-6003"></a>
### ACL-6003 — History operation failed

History read/write operation failed.

**Possible causes**
- History file corrupted
- Permission issues
- Invalid history data

**Try**
- Check history file permissions
- Clear history if corrupted
- Check app data directory

**Current mapping**: `AniError::HistoryOperationFailed { operation, reason }`

---

<a id="ACL-6004"></a>
### ACL-6004 — Invalid history entry

History entry contains invalid data.

**Possible causes**
- History file corrupted
- Invalid data format

**Try**
- Clear history file
- Rebuild history

**Current mapping**: `AniError::InvalidHistoryEntry { reason }`

---

## Authentication / External Services Errors (ACL-7xxx)

<a id="ACL-7001"></a>
### ACL-7001 — Update check failed

Failed to check for updates.

**Possible causes**
- Network issues
- GitHub API unavailable
- Invalid version format

**Try**
- Check your connection
- Try again later
- Manually check for updates

**Current mapping**: `AniError::UpdateCheckFailed { reason }`

---

<a id="ACL-7002"></a>
### ACL-7002 — Invalid release tag

GitHub returned an unsafe or invalid release tag.

**Possible causes**
- GitHub API issue
- Invalid release format

**Try**
- Try again later
- Manually check releases

**Current mapping**: `AniError::InvalidReleaseTag { tag }`

---

<a id="ACL-7003"></a>
### ACL-7003 — Installer execution failed

Update installer failed to execute.

**Possible causes**
- Installer execution failed
- Permission issues
- Invalid installer

**Try**
- Run installer manually
- Check permissions
- Try manual update

**Current mapping**: `AniError::InstallerExecutionFailed { exit_code }`

---

<a id="ACL-7004"></a>
### ACL-7004 — Platform not supported

Update not supported for current platform.

**Possible causes**
- No official releases for platform
- Platform-specific limitations

**Try**
- Build from source
- Use alternative update method

**Current mapping**: `AniError::PlatformNotSupported { platform }`

---

## Internal / Unexpected Errors (ACL-9xxx)

<a id="ACL-9001"></a>
### ACL-9001 — Internal error

ani-cli-rs encountered an unexpected internal error.

**Possible causes**
- Bug in ani-cli-rs
- Unexpected state
- Internal invariant violation

**Try**
- Run again with `--verbose` flag
- Report the issue with full error details
- Include the error code and output

**Current mapping**: `AniError::InternalError { message }`

---

<a id="ACL-9002"></a>
### ACL-9002 — JSON parsing error

Failed to parse JSON data.

**Possible causes**
- Invalid JSON format
- Unexpected JSON structure
- Encoding issues

**Try**
- Try again later
- Report if it persists

**Current mapping**: `AniError::JsonParsingError { source, context }`

---

<a id="ACL-9003"></a>
### ACL-9003 — URL parsing error

Failed to parse URL.

**Possible causes**
- Invalid URL format
- Malformed URL
- Encoding issues

**Try**
- Try again later
- Report if it persists

**Current mapping**: `AniError::UrlParsingError { source, context }`

---

<a id="ACL-9004"></a>
### ACL-9004 — Invalid input

General invalid input error.

**Possible causes**
- Invalid user input
- Invalid configuration
- Invalid parameters

**Try**
- Check your input
- Check configuration
- Try with valid parameters

**Current mapping**: `AniError::InvalidInput { input, reason }`

---

## Error Code Stability

Once an error code is released, its meaning will not change. New error codes may be added, but existing codes will remain stable. This allows:

- Documentation to remain accurate
- Scripts to rely on specific error codes
- Support triage to use error codes effectively
- Library consumers to handle errors predictably

## Using Error Codes Programmatically

Library consumers can use error codes for programmatic error handling:

```rust
use ani_lib::{AniError, ErrorCode};

match result {
    Err(error) if error.code() == ErrorCode::NoPlayableSources => {
        // Handle no sources case
        println!("No sources available, trying fallback...");
    }
    Err(error) if error.code() == ErrorCode::ProviderUnavailable => {
        // Handle provider unavailable case
        println!("Provider unavailable, switching providers...");
    }
    Err(error) => {
        // Handle other errors
        eprintln!("Error: {}", error);
    }
    Ok(_) => println!("Success!")
}
```

## Error Output Examples

### Normal mode (default)
Compact, user-friendly error messages with helpful suggestions.

```
error[ACL-3001]: No playable sources found

No playable sources were found for episode 7.

help: Try another provider or try again later.
docs: https://vorlie.github.io/ani-cli-rs/errors#ACL-3001
```

### Verbose mode (`--verbose`)
Includes additional context information and error chains.

```
error[ACL-3001]: No playable sources found

No playable sources were found for episode 7.

Provider: Anikoto
Episode: 7
Mode: sub

Caused by:
  provider returned no playable streams

help: Try another provider or try again later.
docs: https://vorlie.github.io/ani-cli-rs/errors#ACL-3001
```

### Debug mode (`--debug`)
Full diagnostic information with detailed error chains and internal state.

```
error[ACL-3001]

Debug information:
  provider = anikoto
  episode = 7
  error_code = ACL-3001
  error_slug = no-playable-sources

Error chain:
  [0]: No playable sources found
  [1]: provider returned no playable streams

User message:
  No playable sources found
  No playable sources were found for episode 7.

Help:
  Try another provider or try again later.

Documentation: https://vorlie.github.io/ani-cli-rs/errors/no-playable-sources
```

## Reporting Errors

When reporting an error, please include:

1. The error code (e.g., `ACL-3001`)
2. The complete error message
3. ani-cli-rs version
4. Operating system
5. Provider being used (if applicable)
6. `--verbose` output if available

This helps in quickly identifying and resolving issues.


# ./rust-scraper/website/docs/support/troubleshooting.md

# Troubleshooting

Start by identifying which stage failed:

1. installation or `PATH`;
2. search/episode discovery;
3. provider server/native-source resolution;
4. KotoCDN relay handling;
5. player launch;
6. download transfer/finalization.

The distinction matters: reinstalling will not repair a provider outage, and changing providers will not fix a missing player executable.

## Error codes

ani-cli-rs uses stable error codes to make failures easier to understand and report. Error codes follow the format `ACL-xxxx`:

- **ACL-1xxx**: Network / provider errors
- **ACL-2xxx**: Search / anime / episode errors  
- **ACL-3xxx**: Streaming / source errors
- **ACL-4xxx**: Download errors
- **ACL-5xxx**: Playback errors
- **ACL-6xxx**: Filesystem / configuration errors
- **ACL-7xxx**: Authentication / external services
- **ACL-9xxx**: Internal / unexpected errors

Example error output:
```
error[ACL-3001]: No playable sources found

No playable sources were found for episode 7.

help: Try another provider or try again later.
docs: https://vorlie.github.io/ani-cli-rs/errors#ACL-3001
```

When reporting issues, always include the error code (e.g., `ACL-3001`) along with the complete error message. This helps in quickly identifying and resolving issues.

For a complete error code reference with causes and solutions, see the [Error codes documentation](../errors/).


## Installed but command not found

Windows portable installations default to:

```text
C:\Users\USER\.local\bin\ani-cli-rs.exe

```

Check:

```powershell
Test-Path "$HOME\.local\bin\ani-cli-rs.exe"
[Environment]::GetEnvironmentVariable("Path", "User")
Get-Command ani-cli-rs.exe -ErrorAction SilentlyContinue

```

Open a new PowerShell or Command Prompt after installation. The current terminal does not automatically inherit persistent `PATH` changes made by another process.

Linux:

```sh
ls -l "$HOME/.local/bin/ani-cli-rs"
printf '%s\n' "$PATH"
command -v ani-cli-rs

```

Source the updated profile to reload your `PATH` in the current terminal session:

* **Bash:** `source ~/.profile` (or `source ~/.bashrc`)
* **Zsh:** `source ~/.zshrc`
* **Fish:** `fish_add_path ~/.local/bin`

## Windows installer says the architecture is unsupported

Current installer scripts deliberately select the published x64 Windows archive on Windows, including Windows 11 ARM64 systems that can emulate x64. Download the newest `install.ps1`; older cached copies may still contain architecture detection that rejects some systems.

Useful system information:

```powershell
[Environment]::Is64BitOperatingSystem
[Environment]::Is64BitProcess
$env:PROCESSOR_ARCHITECTURE
$env:PROCESSOR_ARCHITEW6432
Get-CimInstance Win32_OperatingSystem | Select-Object Caption, Version, BuildNumber, OSArchitecture
```

## Rust says edition 2024 is unavailable

Your shell is using an old Cargo. Verify:

```sh
which cargo
which rustc
cargo --version
rustc --version
```

After installing through rustup:

```sh
source "$HOME/.cargo/env"
rustup update stable
```

Ensure `$HOME/.cargo/bin` appears before `/usr/bin` in `PATH`.

## Musl target cannot find `core` or `std`

Install the exact target:

```sh
rustup target add x86_64-unknown-linux-musl
```

or:

```sh
rustup target add aarch64-unknown-linux-musl
```

Also install the corresponding musl linker/toolchain through your distribution.

## Search works but sources fail

Retry once, or select the other catalog with `--provider anikoto2` or `--provider anikoto`. Common categories:

- `rate limit reached`: wait before retrying;
- `catalog error`: the selected catalog endpoint failed;
- `no mapping`: the catalog could not map the selected episode to an embed;
- `native source resolution failed`: returned servers were unsupported, deleted, or changed;
- `provider playlist exceeds ... limit`: the response violated relay safety bounds.

Repeated rapid retries can prolong upstream throttling.

## A title works but another does not

Different episodes use different third-party hosts. One show can resolve through MegaPlay or VidTube while another has only unsupported or deleted embeds. Include the show ID, episode, mode, version, and sanitized provider categories in a bug report.

Do not include complete signed media URLs.

## HTTP 403 during playback or download

Likely causes:

- expired signed URL;
- missing provider referrer/origin;
- URL bound to another public IP;
- router, DNS, antivirus, or corporate filtering;
- too many parallel connections.

Resolve the source again. Test the other catalog, another network, or a VPN only if allowed by your network policy. FortiGuard and similar filters may classify catalog or media hosts as adult/streaming content even when ani-cli-rs itself works correctly.

## Player doesn't start or stream fails to load

If the player doesn't start or shows errors loading the stream, it may be due to:

1. **Player executable not found**: Verify the player is installed and in PATH (see above)
2. **New streaming domains**: Some providers may use new domains not yet in the HLS relay allowlist

Try forcing all streams through the HLS relay using the `--ignore-host-lists` flag:

```bash
ani-cli-rs --ignore-host-lists "anime title"
# or short form
ani-cli-rs -I "anime title"
```

You can also set this permanently via environment variable:

```bash
export ANI_CLI_IGNORE_HOST_LISTS=1
```

This forces all HLS streams through the local relay regardless of the host domain, which can resolve issues with new or unrecognized streaming domains.

## mpv, VLC, Syncplay, aria2c, yt-dlp, or FFmpeg not found

Verify the executable directly:

```powershell
Get-Command mpv.exe, vlc.exe, syncplay.exe, aria2c.exe, yt-dlp.exe, ffmpeg.exe -ErrorAction SilentlyContinue
```

```sh
command -v mpv vlc syncplay aria2c yt-dlp ffmpeg
```

If the player is not found in PATH, ani-cli-rs will now display a clear error message with installation instructions. You can also override the player executable using the `ANI_CLI_PLAYER` environment variable or the `--player` flag for the play subcommand.

## Termux opens terminal VLC or cannot find an Android player

`pkg install vlc` installs a terminal program and does not expose the separately installed Android VLC application. Install an Android player app and ensure the standard Termux tools are current:

```sh
pkg install termux-tools
command -v termux-am-starter termux-am am termux-open termux-open-url
```

Run `ani-cli-rs "title"` to request mpv-android or `ani-cli-rs --vlc "title"` to request Android VLC. If the explicit activity launcher reports a missing socket, ani-cli-rs uses media-typed `termux-open` before falling back to `termux-open-url`. Android's chosen/default media handler controls the fallback, so `--vlc` cannot force VLC there. If Android still opens a browser, clear that browser's default link association and select an installed video player. If the activity launcher is installed at a custom path, set `ANI_CLI_PLAYER` to that launcher.

## Termux playback stops after returning to the terminal

Protected HLS is served through a loopback relay owned by the running ani-cli-rs process. Leave Termux running in the background while watching and press Enter only after playback has ended. Pressing Enter early shuts down the relay and makes the player lose its playlist and segments.

## Termux video plays without external subtitles

Open the Android player's subtitle menu and select the provider track. ani-cli-rs exposes separate provider subtitles as standard HLS subtitle renditions. Device testing confirmed them with mpv-android, VLC, Amnis, and Samsung Video Player, but behavior can still differ between Android versions and player builds. Burned-in subtitles are unaffected.

If a player reports a 30-minute subtitle rendition for an unusual movie or special, the provider subtitle could not be parsed for its final cue time and ani-cli-rs used its bounded fallback duration. Include the provider name, title, episode, and sanitized `links --json` output in a bug report.

Install only the tools needed by your workflow. Direct downloads can fall back to Rust; HLS requires yt-dlp or FFmpeg.

## `.part` remains after a download

The transfer did not finalize. Rerun the same command to resume where supported. Check free disk space, file permissions, antivirus quarantine, whether another program holds the final filename, and the final aria2/ani-cli-rs error. See [Downloads](../guides/downloads.md#why-files-use-part).

## Debugging without leaking secrets

Safe report template:

```text
ani-cli-rs version:
OS and architecture:
Command shape (redact title if needed):
Show ID and episode:
Sub or dub:
Provider failure categories:
Expected behavior:
Actual behavior:
```

Never attach cookies, authorization headers, active signed URLs, raw decrypted episode payloads, or personal paths unless carefully sanitized.


# ./rust-scraper/website/docs/support/index.md

# Support & Help Center

Welcome to the ani-cli-rs support hub. If you're having trouble with the tool, please follow the steps below to find a solution or get assistance.

## 1. Check the Troubleshooting Guide
Most common issues (playback errors, installation problems, provider failures) are covered in our detailed troubleshooting section.

[Go to Troubleshooting Guide](troubleshooting.md){ .md-button .md-button--primary }

## 2. Browse the FAQ
Search for quick answers to common questions about features, compatibility, and configuration.

[View FAQ](../faq.md){ .md-button }

## 3. Search Existing Issues
If your problem isn't covered in the documentation, it might have already been reported. Search our GitHub issue tracker to see if a solution or workaround exists.

[Search GitHub Issues](https://github.com/vorlie/ani-cli-rs/issues){ .md-button }

## 4. Reporting a Bug or Requesting a Feature
If you've found a new bug or have a suggestion, please open a new issue on GitHub. 

When reporting a bug, please include:

- **Version:** The output of `ani-cli-rs --version`.
- **OS:** Your operating system (Linux, Windows, macOS, Android/Termux).
- **Player:** The media player you are using (mpv, VLC, etc.).
- **Provider:** The provider where the issue occurs.
- **Steps to reproduce:** Clear instructions on how to trigger the issue.
- **Logs:** Run with `RUST_LOG=debug` if possible and include relevant output.

[Open an Issue](https://github.com/vorlie/ani-cli-rs/issues/new/choose){ .md-button .md-button--primary }

---

### Community & Assistance
For general questions or community help, feel free to join our [Discord](https://discord.gg/9SXX6ddpNR) (if applicable) or participate in [GitHub Discussions](https://github.com/vorlie/ani-cli-rs/discussions).
